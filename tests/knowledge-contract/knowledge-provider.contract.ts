import { describe, expect, it } from "vitest";
import type { KnowledgeProvider } from "../../src/knowledge/knowledge-provider.js";

export function knowledgeProviderContract(
  implementation: string,
  createProvider: () => KnowledgeProvider,
): void {
  describe(`${implementation} KnowledgeProvider contract`, () => {
    it("returns normalized, traceable search results", async () => {
      const results = await createProvider().search("如何修改密码？", {
        limit: 1,
      });

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toBeDefined();
      if (result === undefined)
        throw new Error("KnowledgeProvider returned no result");
      expect(typeof result.id).toBe("string");
      expect(typeof result.title).toBe("string");
      expect(typeof result.content).toBe("string");
      expect(typeof result.source).toBe("string");
      expect(typeof result.metadata).toBe("object");
      expect(typeof result.updatedAt).toBe("string");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("returns an empty collection for missing knowledge", async () => {
      await expect(
        createProvider().search("不存在的企业知识条目"),
      ).resolves.toEqual([]);
    });
  });
}
