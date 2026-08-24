import { describe, expect, it, vi } from "vitest";
import {
  mapRagflowResponse,
  RagflowKnowledgeProvider,
} from "../src/knowledge/adapters/ragflow/ragflow-knowledge-provider.js";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";

const apiKey = "ragflow-super-secret";

describe("RagflowKnowledgeProvider", () => {
  it("calls the official retrieval endpoint and maps chunks", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        code: 0,
        data: {
          chunks: [
            {
              id: "chunk-1",
              content: "进入安全设置修改密码。",
              document_name: "账号指南.md",
              document_id: "document-1",
              dataset_id: "dataset-1",
              similarity: 1.2,
              create_time: "2026-08-20T10:00:00Z",
              metadata: { category: "account", private: { hidden: true } },
            },
          ],
        },
      }),
    );
    const provider = createProvider(fetchImplementation);

    const results = await provider.search("如何修改密码？", { limit: 3 });

    expect(fetchImplementation).toHaveBeenCalledOnce();
    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(url).toBe("https://ragflow.example.com/api/v1/retrieval");
    expect(request).toMatchObject({
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
    });
    expect(typeof request?.body).toBe("string");
    const requestBody: unknown =
      typeof request?.body === "string" ? JSON.parse(request.body) : undefined;
    expect(requestBody).toEqual({
      question: "如何修改密码？",
      dataset_ids: ["dataset-1"],
      page: 1,
      page_size: 3,
    });
    expect(results).toEqual([
      {
        id: "chunk-1",
        title: "账号指南.md",
        content: "进入安全设置修改密码。",
        source: "账号指南.md",
        score: 1,
        metadata: {
          category: "account",
          datasetId: "dataset-1",
          documentId: "document-1",
        },
        updatedAt: "2026-08-20T10:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when RAGFlow has no chunks", async () => {
    const provider = createProvider(async () =>
      jsonResponse({ code: 0, data: { chunks: [] } }),
    );
    await expect(provider.search("unknown")).resolves.toEqual([]);
  });

  it.each([401, 403])(
    "maps HTTP %s to authentication failure",
    async (status) => {
      const provider = createProvider(
        async () => new Response("denied", { status }),
      );
      await expect(provider.search("query")).rejects.toMatchObject({
        code: "KNOWLEDGE_PROVIDER_AUTH_FAILED",
        message: "Knowledge provider authentication failed",
      });
    },
  );

  it("maps server and network failures to unavailable", async () => {
    const serverFailure = createProvider(
      async () => new Response("internal details", { status: 500 }),
    );
    const networkFailure = createProvider(async () => {
      throw new Error("connect ECONNREFUSED ragflow-super-secret");
    });
    await expect(serverFailure.search("query")).rejects.toMatchObject({
      code: "KNOWLEDGE_PROVIDER_UNAVAILABLE",
      message: "Knowledge provider is unavailable",
    });
    await expect(networkFailure.search("query")).rejects.toMatchObject({
      code: "KNOWLEDGE_PROVIDER_UNAVAILABLE",
      message: "Knowledge provider is unavailable",
    });
  });

  it("maps timeout to a stable error", async () => {
    const provider = new RagflowKnowledgeProvider({
      baseUrl: "https://ragflow.example.com",
      apiKey,
      datasetIds: ["dataset-1"],
      timeoutMs: 5,
      fetch: (_input, request) =>
        new Promise((_resolve, reject) => {
          request?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    });
    await expect(provider.search("query")).rejects.toMatchObject({
      code: "KNOWLEDGE_PROVIDER_TIMEOUT",
      message: "Knowledge provider request timed out",
    });
  });

  it("rejects malformed JSON and response schemas", async () => {
    const invalidJson = createProvider(
      async () => new Response("not-json", { status: 200 }),
    );
    const invalidSchema = createProvider(async () =>
      jsonResponse({ code: 0, data: { chunks: [{ id: "missing-fields" }] } }),
    );
    await expect(invalidJson.search("query")).rejects.toMatchObject({
      code: "KNOWLEDGE_PROVIDER_BAD_RESPONSE",
    });
    await expect(invalidSchema.search("query")).rejects.toMatchObject({
      code: "KNOWLEDGE_PROVIDER_BAD_RESPONSE",
    });
  });

  it("keeps credentials and third-party response bodies out of errors", async () => {
    const provider = createProvider(
      async () => new Response(`upstream leaked ${apiKey}`, { status: 500 }),
    );
    const error = await provider
      .search("query")
      .catch((cause: unknown) => cause);
    expect(String(error)).not.toContain(apiKey);
    expect(String(error)).not.toContain("upstream leaked");
  });

  it("keeps credentials and raw bodies out of Runtime events", async () => {
    const provider = createProvider(
      async () => new Response(`upstream leaked ${apiKey}`, { status: 500 }),
    );
    const events = [];
    for await (const event of new FakeRuntime().run({
      conversationId: "conversation_redaction",
      agent: createCustomerServiceAgent(undefined, provider),
      messages: [
        {
          role: "user",
          content: "如何修改密码？",
          createdAt: new Date().toISOString(),
        },
      ],
      context: {},
    })) {
      events.push(event);
    }
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain("upstream leaked");
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "knowledge.search.failed",
        errorCode: "KNOWLEDGE_PROVIDER_UNAVAILABLE",
      }),
    );
  });
});

describe("mapRagflowResponse", () => {
  it("encapsulates legacy official field aliases and normalizes low scores", () => {
    expect(
      mapRagflowResponse({
        code: 0,
        data: {
          chunks: [
            {
              chunk_id: "legacy-chunk",
              content_with_weight: "Legacy content",
              docnm_kwd: "unused-in-public-contract",
              document_keyword: "legacy.pdf",
              kb_id: "legacy-dataset",
              doc_id: "legacy-document",
              similarity: -0.2,
              create_timestamp: 1_700_000_000,
            },
          ],
        },
      }),
    ).toEqual([
      expect.objectContaining({
        id: "legacy-chunk",
        source: "legacy.pdf",
        score: 0,
        metadata: {
          datasetId: "legacy-dataset",
          documentId: "legacy-document",
        },
      }),
    ]);
  });
});

function createProvider(fetchImplementation: typeof fetch) {
  return new RagflowKnowledgeProvider({
    baseUrl: "https://ragflow.example.com/",
    apiKey,
    datasetIds: ["dataset-1"],
    fetch: fetchImplementation,
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
