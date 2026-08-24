import { describe, expect, it } from "vitest";
import { createCustomerServiceAgent } from "../../src/agents/customer-service/index.js";
import type { KnowledgeProvider } from "../../src/knowledge/knowledge-provider.js";
import { AppError } from "../../src/shared/errors.js";
import { FakeRuntime } from "../../src/runtime/fake-runtime.js";
import { createPiContractTestRuntime } from "../../src/runtime/pi-adapter/pi-contract-test-runtime.js";
import type { RuntimeEvent } from "../../src/runtime/runtime-events.js";

const failingProvider: KnowledgeProvider = {
  id: "failing-knowledge",
  search: async () => {
    throw new AppError(
      "KNOWLEDGE_PROVIDER_TIMEOUT",
      "Knowledge provider request timed out",
    );
  },
};

describe.each([
  {
    name: "FakeRuntime",
    subject: () => ({
      runtime: new FakeRuntime(),
      agent: createCustomerServiceAgent(undefined, failingProvider),
    }),
  },
  {
    name: "PiRuntimeAdapter",
    subject: () => {
      const pi = createPiContractTestRuntime({
        toolName: "search_knowledge",
        toolArguments: { query: "如何修改密码？" },
      });
      return {
        runtime: pi.runtime,
        agent: createCustomerServiceAgent(pi.model, failingProvider),
      };
    },
  },
])("$name knowledge failure contract", ({ subject }) => {
  it("emits one failed terminal after the tool failure", async () => {
    const { runtime, agent } = subject();
    const events: RuntimeEvent[] = [];
    for await (const event of runtime.run({
      conversationId: "conversation_failure",
      agent,
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
    const types = events.map(({ type }) => type);
    const knowledgeFailure = events.find(
      (event) => event.type === "knowledge.search.failed",
    );

    expect(types).toEqual(
      expect.arrayContaining([
        "knowledge.search.started",
        "tool.started",
        "tool.failed",
        "knowledge.search.failed",
        "run.failed",
      ]),
    );
    expect(types.indexOf("knowledge.search.started")).toBeLessThan(
      types.indexOf("tool.started"),
    );
    expect(types.indexOf("tool.failed")).toBeLessThan(
      types.indexOf("knowledge.search.failed"),
    );
    expect(types).not.toContain("knowledge.search.completed");
    if (knowledgeFailure?.type !== "knowledge.search.failed") {
      throw new Error("Expected knowledge.search.failed");
    }
    expect(knowledgeFailure.provider).toBe("failing-knowledge");
    expect(knowledgeFailure.errorCode).toBe("KNOWLEDGE_PROVIDER_TIMEOUT");
    expect(typeof knowledgeFailure.traceId).toBe("string");
    expect(typeof knowledgeFailure.durationMs).toBe("number");
    expect(JSON.stringify(knowledgeFailure)).not.toContain("apiKey");
  });
});
