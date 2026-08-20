import { describe, expect, it } from "vitest";
import {
  newConversation,
  newMessage,
} from "../src/conversations/conversation.js";
import { InMemoryConversationRepository } from "../src/conversations/in-memory-conversation-repository.js";

describe("InMemoryConversationRepository", () => {
  it("creates, reads, appends and updates without exposing mutable storage", async () => {
    const repository = new InMemoryConversationRepository();
    const created = await repository.createConversation(
      newConversation("customer-service", "1.0.0"),
    );
    await repository.appendMessage(created.id, newMessage("user", "你好"));
    const updated = await repository.updateConversation(created.id, {
      status: "resolved",
    });

    expect(updated.status).toBe("resolved");
    expect(updated.agentVersion).toBe("1.0.0");
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]?.content).toBe("你好");
    expect(await repository.getConversation("missing")).toBeUndefined();
  });
});
