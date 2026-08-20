import { AppError } from "../shared/errors.js";
import type { Conversation, ConversationMessage } from "./conversation.js";
import type { ConversationRepository } from "./conversation-repository.js";

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, Conversation>();

  async createConversation(conversation: Conversation): Promise<Conversation> {
    if (this.conversations.has(conversation.id)) {
      throw new AppError(
        "CONVERSATION_EXISTS",
        "Conversation already exists",
        409,
      );
    }
    const stored = structuredClone(conversation);
    this.conversations.set(stored.id, stored);
    return structuredClone(stored);
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    return conversation === undefined
      ? undefined
      : structuredClone(conversation);
  }

  async appendMessage(
    id: string,
    message: ConversationMessage,
  ): Promise<Conversation> {
    const conversation = this.requireConversation(id);
    const updated: Conversation = {
      ...conversation,
      messages: [...conversation.messages, structuredClone(message)],
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, updated);
    return structuredClone(updated);
  }

  async updateConversation(
    id: string,
    update: Pick<Conversation, "status">,
  ): Promise<Conversation> {
    const conversation = this.requireConversation(id);
    const updated: Conversation = {
      ...conversation,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, updated);
    return structuredClone(updated);
  }

  private requireConversation(id: string): Conversation {
    const conversation = this.conversations.get(id);
    if (conversation === undefined) {
      throw new AppError(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found",
        404,
      );
    }
    return conversation;
  }
}
