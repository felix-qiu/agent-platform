import type {
  KnowledgeProvider,
  KnowledgeResult,
  KnowledgeSearchContext,
} from "../../knowledge/knowledge-provider.js";
import { MockKnowledgeProvider } from "../../knowledge/mock/mock-knowledge-provider.js";
import type { BusinessTool } from "../tool.js";
import { AppError } from "../../shared/errors.js";

export interface SearchKnowledgeInput {
  readonly query: string;
  readonly category?: string;
  readonly limit?: number;
}

export interface SearchKnowledgeOutput {
  readonly results: readonly KnowledgeResult[];
}

export function createSearchKnowledgeTool(
  provider: KnowledgeProvider,
): BusinessTool<SearchKnowledgeInput, SearchKnowledgeOutput> {
  return {
    name: "search_knowledge",
    version: "1.0.0",
    description: "检索企业知识，用于回答产品、账户、政策和操作说明问题。",
    permissions: ["knowledge:read"],
    observability: {
      namespace: "knowledge.search",
      attributes: { provider: provider.id },
    },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "用户需要查询的知识问题" },
        category: { type: "string", description: "可选的知识分类" },
        limit: {
          type: "number",
          description: "最大返回条数",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    async execute(input, executionContext) {
      const context = searchContext(input, executionContext.signal);
      try {
        const results = await provider.search(input.query, context);
        return { ok: true, data: { results } };
      } catch (error) {
        return { ok: false, error: normalizeKnowledgeError(error) };
      }
    },
  };
}

function searchContext(
  input: SearchKnowledgeInput,
  signal?: AbortSignal,
): KnowledgeSearchContext | undefined {
  if (
    input.category === undefined &&
    input.limit === undefined &&
    signal === undefined
  )
    return undefined;
  return {
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(signal === undefined ? {} : { signal }),
  };
}

function normalizeKnowledgeError(error: unknown): {
  readonly code: string;
  readonly message: string;
} {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "KNOWLEDGE_PROVIDER_UNAVAILABLE",
    message: "Knowledge provider is unavailable",
  };
}

export const mockKnowledgeProvider = new MockKnowledgeProvider();
export const searchKnowledgeTool = createSearchKnowledgeTool(
  mockKnowledgeProvider,
);
