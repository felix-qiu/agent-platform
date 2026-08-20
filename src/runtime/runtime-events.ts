export interface RuntimeEventBase {
  readonly runId: string;
  readonly conversationId: string;
  readonly agentId: string;
  readonly timestamp: string;
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
    })
  | (RuntimeEventBase & {
      readonly type: "tool.completed";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly result: unknown;
      readonly durationMs: number;
    })
  | (RuntimeEventBase & {
      readonly type: "tool.failed";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly error: { readonly code: string; readonly message: string };
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
