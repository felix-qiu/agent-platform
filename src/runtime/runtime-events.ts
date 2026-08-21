export interface RuntimeEventBase {
  readonly runId: string;
  readonly traceId: string;
  readonly conversationId: string;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly timestamp: string;
}

export interface KnowledgeMatchReference {
  readonly id: string;
  readonly source: string;
  readonly score: number;
}

export type RuntimeEvent =
  | (RuntimeEventBase & {
      readonly type: "run.started";
    })
  | (RuntimeEventBase & {
      readonly type: "message.delta";
      readonly delta: string;
    })
  | (RuntimeEventBase & {
      readonly type: "message.completed";
      readonly content: string;
    })
  | (RuntimeEventBase & {
      readonly type: "tool.started";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly toolVersion: string;
    })
  | (RuntimeEventBase & {
      readonly type: "tool.completed";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly toolVersion: string;
      readonly result: unknown;
      readonly durationMs: number;
    })
  | (RuntimeEventBase & {
      readonly type: "tool.failed";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly toolVersion: string;
      readonly error: { readonly code: string; readonly message: string };
      readonly durationMs: number;
    })
  | (RuntimeEventBase & {
      readonly type: "knowledge.search.started";
      readonly provider: string;
    })
  | (RuntimeEventBase & {
      readonly type: "knowledge.search.completed";
      readonly provider: string;
      readonly matches: readonly KnowledgeMatchReference[];
      readonly durationMs: number;
    })
  | (RuntimeEventBase & {
      readonly type: "run.completed";
      readonly durationMs: number;
    })
  | (RuntimeEventBase & {
      readonly type: "run.failed";
      readonly error: { readonly code: string; readonly message: string };
      readonly durationMs: number;
    });
