import type {
  KnowledgeProvider,
  KnowledgeResult,
  KnowledgeSearchContext,
} from "../knowledge-provider.js";

const knowledgeBase: readonly KnowledgeResult[] = [
  {
    id: "doc-001",
    title: "密码修改说明",
    content: "进入账户设置页面，选择“安全设置”，验证当前身份后即可修改密码。",
    source: "account-guide",
    score: 0.98,
    metadata: { category: "account", status: "published" },
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
  {
    id: "doc-002",
    title: "账号手机号修改说明",
    content: "进入账户设置页面，完成身份验证后可以修改绑定手机号。",
    source: "account-guide",
    score: 0.94,
    metadata: { category: "account", status: "published" },
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
];

export class MockKnowledgeProvider implements KnowledgeProvider {
  readonly id = "mock-knowledge";

  async search(
    query: string,
    context?: KnowledgeSearchContext,
  ): Promise<KnowledgeResult[]> {
    const normalized = query.trim().toLowerCase();
    const matches = knowledgeBase.filter((result) => {
      if (
        context?.category !== undefined &&
        result.metadata.category !== context.category
      ) {
        return false;
      }
      if (normalized.includes("密码")) return result.id === "doc-001";
      if (normalized.includes("手机号") || normalized.includes("手机")) {
        return result.id === "doc-002";
      }
      return false;
    });
    return matches
      .slice(0, context?.limit ?? 5)
      .map((result) => structuredClone(result));
  }
}
