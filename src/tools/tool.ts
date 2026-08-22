export interface JsonObjectSchema {
  readonly type: "object";
  readonly properties: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

export type ToolResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: string; readonly message: string };
    };

export interface ToolObservability {
  readonly namespace: string;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

export interface BusinessTool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly inputSchema: JsonObjectSchema;
  readonly permissions: readonly string[];
  readonly observability?: ToolObservability;
  execute(
    input: TInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<TOutput>>;
}

export interface ToolExecutionContext {
  readonly conversationId: string;
  readonly agentId: string;
  readonly signal?: AbortSignal;
}
