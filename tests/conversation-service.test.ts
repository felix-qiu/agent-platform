import { describe, expect, it } from "vitest";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";
import { ConversationService } from "../src/conversations/conversation-service.js";
import { InMemoryConversationRepository } from "../src/conversations/in-memory-conversation-repository.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";

describe("ConversationService", () => {
  it("runs an agent turn and persists user, tool and assistant messages", async () => {
    const repository = new InMemoryConversationRepository();
    const service = new ConversationService(
      repository,
      new FakeRuntime(),
      createCustomerServiceAgent(),
    );
    const conversation = await service.createConversation();
    const events = [];

    for await (const event of service.sendMessage(
      conversation.id,
      "我的订单发货了吗？",
    )) {
      events.push(event);
    }

    const saved = await service.getConversation(conversation.id);
    expect(events.some(({ type }) => type === "tool.completed")).toBe(true);
    expect(events.at(-1)?.type).toBe("run.completed");
    expect(saved.messages.map(({ role }) => role)).toEqual([
      "user",
      "tool",
      "tool",
      "tool",
      "assistant",
    ]);
    expect(saved.messages.at(-1)?.content).toContain("已发货");
  });
});
