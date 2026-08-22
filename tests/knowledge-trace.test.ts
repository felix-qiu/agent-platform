import { describe, expect, it } from "vitest";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";
import { createPiContractTestRuntime } from "../src/runtime/pi-adapter/pi-contract-test-runtime.js";
import type { KnowledgeProvider } from "../src/knowledge/knowledge-provider.js";
import { AppError } from "../src/shared/errors.js";
import { InMemoryConversationRepository } from "../src/conversations/in-memory-conversation-repository.js";
import { InMemoryTraceRepository } from "../src/observability/in-memory-trace-repository.js";
import { ConversationService } from "../src/conversations/conversation-service.js";

describe("knowledge trace events", () => {
  it("records provider, source and score for grounded answers", async () => {
    const events = [];
    for await (const event of new FakeRuntime().run({
      conversationId: "conversation_knowledge",
      agent: createCustomerServiceAgent(),
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

    expect(
      events.find(({ type }) => type === "knowledge.search.started"),
    ).toMatchObject({
      provider: "mock-knowledge",
    });
    expect(
      events.find(({ type }) => type === "knowledge.search.completed"),
    ).toMatchObject({
      provider: "mock-knowledge",
      matches: [{ id: "doc-001", source: "account-guide", score: 0.98 }],
    });
  });

  it("maps Pi knowledge Tool execution into portable knowledge events", async () => {
    const subject = createPiContractTestRuntime({
      toolName: "search_knowledge",
      toolArguments: { query: "如何修改密码？" },
      finalResponse: "请进入安全设置修改密码。",
    });
    const events = [];
    for await (const event of subject.runtime.run({
      conversationId: "conversation_pi_knowledge",
      agent: createCustomerServiceAgent(subject.model),
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

    expect(
      events.find(({ type }) => type === "knowledge.search.completed"),
    ).toMatchObject({
      provider: "mock-knowledge",
      matches: [{ source: "account-guide", score: 0.98 }],
    });
  });

  it("persists knowledge.search.failed as the trace terminal", async () => {
    const provider: KnowledgeProvider = {
      id: "unavailable-knowledge",
      search: async () => {
        throw new AppError(
          "KNOWLEDGE_PROVIDER_UNAVAILABLE",
          "Knowledge provider is unavailable",
        );
      },
    };
    const traces = new InMemoryTraceRepository();
    const service = new ConversationService(
      new InMemoryConversationRepository(),
      new FakeRuntime(),
      createCustomerServiceAgent(undefined, provider),
      traces,
    );
    const conversation = await service.createConversation();
    const events = [];
    for await (const event of service.sendMessage(
      conversation.id,
      "如何修改密码？",
    )) {
      events.push(event);
    }
    const traceId = events[0]?.traceId;
    expect(traceId).toBeDefined();
    const trace = await traces.getTrace(traceId ?? "");
    expect(
      trace?.events.find(({ type }) => type === "knowledge.search.failed"),
    ).toMatchObject({
      provider: "unavailable-knowledge",
      errorCode: "KNOWLEDGE_PROVIDER_UNAVAILABLE",
    });
  });
});
