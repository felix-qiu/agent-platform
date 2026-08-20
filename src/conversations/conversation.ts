import { randomUUID } from "node:crypto";

export type ConversationStatus = "active" | "resolved" | "closed";
export type ConversationMessageRole = "user" | "assistant" | "tool";

export interface ConversationMessage {
  readonly id: string;
  readonly role: ConversationMessageRole;
  readonly content: string;
  readonly createdAt: string;
  readonly name?: string;
}

export interface Conversation {
  readonly id: string;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly status: ConversationStatus;
  readonly messages: readonly ConversationMessage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function newConversation(
  agentId: string,
  agentVersion: string,
  now = new Date(),
): Conversation {
  const timestamp = now.toISOString();
  return {
    id: randomUUID(),
    agentId,
    agentVersion,
    status: "active",
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function newMessage(
  role: ConversationMessageRole,
  content: string,
  name?: string,
): ConversationMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(name === undefined ? {} : { name }),
  };
}
