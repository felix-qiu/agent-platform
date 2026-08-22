import { AppError } from "../../../shared/errors.js";
import type {
  KnowledgeMetadataValue,
  KnowledgeProvider,
  KnowledgeResult,
  KnowledgeSearchContext,
} from "../../knowledge-provider.js";

export interface RagflowKnowledgeProviderOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly datasetIds: readonly string[];
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

export class RagflowKnowledgeProvider implements KnowledgeProvider {
  readonly id = "ragflow";
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly datasetIds: readonly string[];
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: RagflowKnowledgeProviderOptions) {
    if (options.datasetIds.length === 0) {
      throw new AppError(
        "KNOWLEDGE_PROVIDER_CONFIG_INVALID",
        "At least one RAGFlow dataset ID is required",
      );
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.datasetIds = [...options.datasetIds];
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
  }

  async search(
    query: string,
    context?: KnowledgeSearchContext,
  ): Promise<KnowledgeResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abortFromCaller = (): void =>
      controller.abort(context?.signal?.reason);
    context?.signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await this.fetchImplementation(
        `${this.baseUrl}/api/v1/retrieval`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            question: query,
            dataset_ids: this.datasetIds,
            page: 1,
            page_size: context?.limit ?? 5,
          }),
          signal: controller.signal,
        },
      );

      if (response.status === 401 || response.status === 403) {
        throw knowledgeError(
          "KNOWLEDGE_PROVIDER_AUTH_FAILED",
          "Knowledge provider authentication failed",
          502,
        );
      }
      if (!response.ok) {
        throw knowledgeError(
          "KNOWLEDGE_PROVIDER_UNAVAILABLE",
          "Knowledge provider is unavailable",
          503,
        );
      }

      let body: unknown;
      try {
        body = JSON.parse(await response.text());
      } catch {
        throw knowledgeError(
          "KNOWLEDGE_PROVIDER_BAD_RESPONSE",
          "Knowledge provider returned an invalid response",
          502,
        );
      }
      return mapRagflowResponse(body, context?.category);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (controller.signal.aborted && context?.signal?.aborted !== true) {
        throw knowledgeError(
          "KNOWLEDGE_PROVIDER_TIMEOUT",
          "Knowledge provider request timed out",
          504,
        );
      }
      throw knowledgeError(
        "KNOWLEDGE_PROVIDER_UNAVAILABLE",
        "Knowledge provider is unavailable",
        503,
      );
    } finally {
      clearTimeout(timeout);
      context?.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

export function mapRagflowResponse(
  body: unknown,
  category?: string,
): KnowledgeResult[] {
  if (!isRecord(body) || body.code !== 0 || !isRecord(body.data)) {
    throw badResponse();
  }
  const chunks = body.data.chunks;
  if (!Array.isArray(chunks)) throw badResponse();
  return chunks.map(parseChunk).filter((chunk) => {
    return category === undefined || chunk.metadata.category === category;
  });
}

function parseChunk(value: unknown): KnowledgeResult {
  if (!isRecord(value)) throw badResponse();
  const id = stringField(value, "id") ?? stringField(value, "chunk_id");
  const content =
    stringField(value, "content") ?? stringField(value, "content_with_weight");
  const title =
    stringField(value, "document_name") ??
    stringField(value, "document_keyword") ??
    "RAGFlow result";
  const datasetId =
    stringField(value, "dataset_id") ?? stringField(value, "kb_id");
  const documentId =
    stringField(value, "document_id") ?? stringField(value, "doc_id");
  const similarity = numberField(value, "similarity");
  if (id === undefined || content === undefined || similarity === undefined) {
    throw badResponse();
  }
  return {
    id,
    title,
    content,
    source: title !== "RAGFlow result" ? title : (datasetId ?? "ragflow"),
    score: Math.max(0, Math.min(1, similarity)),
    metadata: metadataFields(value, datasetId, documentId),
    updatedAt: updatedAt(value),
  };
}

function metadataFields(
  value: Readonly<Record<string, unknown>>,
  datasetId: string | undefined,
  documentId: string | undefined,
): Readonly<Record<string, KnowledgeMetadataValue>> {
  const metadata: Record<string, KnowledgeMetadataValue> = {};
  if (datasetId !== undefined) metadata.datasetId = datasetId;
  if (documentId !== undefined) metadata.documentId = documentId;
  const documentType = stringField(value, "doc_type");
  if (documentType !== undefined) metadata.documentType = documentType;
  if (isRecord(value.metadata)) {
    for (const [key, item] of Object.entries(value.metadata)) {
      if (
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        metadata[key] = item;
      }
    }
  }
  return metadata;
}

function updatedAt(value: Readonly<Record<string, unknown>>): string {
  const createTime = stringField(value, "create_time");
  if (createTime !== undefined && !Number.isNaN(Date.parse(createTime))) {
    return new Date(createTime).toISOString();
  }
  const timestamp = numberField(value, "create_timestamp");
  if (timestamp !== undefined) {
    const milliseconds =
      timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  return new Date(0).toISOString();
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  value: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const field = value[key];
  return typeof field === "string" && field !== "" ? field : undefined;
}

function numberField(
  value: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined {
  const field = value[key];
  return typeof field === "number" && Number.isFinite(field)
    ? field
    : undefined;
}

function badResponse(): AppError {
  return knowledgeError(
    "KNOWLEDGE_PROVIDER_BAD_RESPONSE",
    "Knowledge provider returned an invalid response",
    502,
  );
}

function knowledgeError(
  code: string,
  message: string,
  statusCode: number,
): AppError {
  return new AppError(code, message, statusCode);
}
