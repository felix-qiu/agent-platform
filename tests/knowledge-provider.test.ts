import { describe, expect, it } from "vitest";
import { MockKnowledgeProvider } from "../src/knowledge/mock/mock-knowledge-provider.js";

describe("MockKnowledgeProvider", () => {
  it("returns deterministic password guidance", async () => {
    const provider = new MockKnowledgeProvider();
    const first = await provider.search("如何修改密码？");
    const second = await provider.search("如何修改密码？");

    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      id: "doc-001",
      source: "account-guide",
      metadata: { category: "account" },
    });
    expect(first[0]?.content).toContain("安全设置");
  });
});
