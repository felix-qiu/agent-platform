import { describe, expect, it } from "vitest";
import { MockKnowledgeProvider } from "../src/knowledge/mock/mock-knowledge-provider.js";
import { createSearchKnowledgeTool } from "../src/tools/knowledge/search-knowledge.js";

describe("search_knowledge Tool", () => {
  it("uses KnowledgeProvider and returns normalized results", async () => {
    const tool = createSearchKnowledgeTool(new MockKnowledgeProvider());
    const result = await tool.execute(
      { query: "如何修改密码？", limit: 1 },
      { conversationId: "conversation_1", agentId: "customer-service" },
    );

    expect(tool).toMatchObject({
      name: "search_knowledge",
      version: "1.0.0",
      permissions: ["knowledge:read"],
      observability: {
        namespace: "knowledge.search",
        attributes: { provider: "mock-knowledge" },
      },
    });
    expect(result).toMatchObject({
      ok: true,
      data: { results: [{ id: "doc-001", source: "account-guide" }] },
    });
  });
});
