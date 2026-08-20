import type { AgentDefinition } from "../agents/agent-definition.js";
import type { AgentRuntime } from "../runtime/agent-runtime.js";
import type { RuntimeEvent } from "../runtime/runtime-events.js";
import { AppError } from "../shared/errors.js";
import {
  newConversation,
  newMessage,
  type Conversation,
} from "./conversation.js";
import type { ConversationRepository } from "./conversation-repository.js";

export class ConversationService {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly runtime: AgentRuntime,
    private readonly agent: AgentDefinition,
  ) {}

  async createConversation(): Promise<Conversation> {
    return this.repository.createConversation(newConversation(this.agent.id));
  }

  async getConversation(id: string): Promise<Conversation> {
    const conversation = await this.repository.getConversation(id);
    if (conversation === undefined) {
      throw new AppError(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found",
        404,
      );
    }
    return conversation;
  }

  async *sendMessage(
    conversationId: string,
    content: string,
  ): AsyncIterable<RuntimeEvent> {
    const existing = await this.getConversation(conversationId);
    if (existing.status === "closed") {
      throw new AppError("CONVERSATION_CLOSED", "Conversation is closed", 409);
    }

    const conversation = await this.repository.appendMessage(
      conversationId,
      newMessage("user", content),
    );

    let completedMessage: string | undefined;
    for await (const event of this.runtime.run({
      conversationId,
      agent: this.agent,
      messages: conversation.messages,
      context: {},
    })) {
      if (event.type === "tool.completed") {
        await this.repository.appendMessage(
          conversationId,
          newMessage("tool", JSON.stringify(event.result), event.toolName),
        );
      }
      if (event.type === "tool.failed") {
        await this.repository.appendMessage(
          conversationId,
          newMessage("tool", JSON.stringify(event.error), event.toolName),
        );
      }
      if (event.type === "message.completed") {
        completedMessage = event.content;
      }
      yield event;
    }

    if (completedMessage !== undefined) {
      await this.repository.appendMessage(
        conversationId,
        newMessage("assistant", completedMessage),
      );
    }
  }
}
