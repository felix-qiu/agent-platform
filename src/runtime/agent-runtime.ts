import type { AgentDefinition } from "../agents/agent-definition.js";
import type { RuntimeEvent } from "./runtime-events.js";

export interface AgentRuntimeMessage {
  readonly role: "user" | "assistant" | "tool";
  readonly content: string;
  readonly createdAt: string;
  readonly name?: string;
}

export interface AgentRunInput {
  readonly conversationId: string;
  readonly agent: AgentDefinition;
  readonly messages: readonly AgentRuntimeMessage[];
  readonly context: Readonly<Record<string, unknown>>;
}

export interface AgentRuntime {
  run(input: AgentRunInput): AsyncIterable<RuntimeEvent>;
}
