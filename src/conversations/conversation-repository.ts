import type {
  Conversation,
  ConversationMessage,
  ConversationStatus,
} from "./conversation.js";

export interface ConversationRepository {
  createConversation(conversation: Conversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  appendMessage(
    id: string,
    message: ConversationMessage,
  ): Promise<Conversation>;
  updateConversation(
    id: string,
    update: { readonly status?: ConversationStatus },
  ): Promise<Conversation>;
}
