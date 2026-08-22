import { randomUUID } from "node:crypto";
import {
  Agent,
  type AgentEvent,
  type AgentMessage,
} from "@earendil-works/pi-agent-core";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import type { Api, Model, MutableModels, Usage } from "@earendil-works/pi-ai";
import type { AgentRuntime, AgentRunInput } from "../agent-runtime.js";
import type { RuntimeEvent, RuntimeEventBase } from "../runtime-events.js";
import type { BusinessTool } from "../../tools/tool.js";
import { errorMessage } from "../../shared/errors.js";
import { toPiTool } from "./pi-tool-adapter.js";
import { AsyncEventQueue } from "./async-event-queue.js";
import {
  toolObservationCompleted,
  toolObservationFailed,
  toolObservationStarted,
} from "../../observability/tool-observability.js";

const emptyUsage: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export interface PiRuntimeAdapterOptions {
  readonly apiKey?: string;
}

export class PiRuntimeAdapter implements AgentRuntime {
  constructor(
    private readonly options: PiRuntimeAdapterOptions = {},
    private readonly modelsFactory: () => MutableModels = builtinModels,
  ) {}

  async *run(input: AgentRunInput): AsyncIterable<RuntimeEvent> {
    const runId = randomUUID();
    const traceId = randomUUID();
    const startedAt = Date.now();
    const base = (): RuntimeEventBase => ({
      runId,
      traceId,
      conversationId: input.conversationId,
      agentId: input.agent.id,
      agentVersion: input.agent.version,
      timestamp: new Date().toISOString(),
    });

    yield { ...base(), type: "run.started" };

    const queue = new AsyncEventQueue<RuntimeEvent>();
    let failed = false;
    const execute = async (): Promise<void> => {
      try {
        const models = this.modelsFactory();
        const model = models.getModel(
          input.agent.model.provider,
          input.agent.model.id,
        );
        if (model === undefined) {
          throw new Error(
            `Unknown Pi model: ${input.agent.model.provider}/${input.agent.model.id}`,
          );
        }

        const lastMessage = input.messages.at(-1);
        if (lastMessage?.role !== "user") {
          throw new Error("A runtime run must end with a user message");
        }

        const agent = new Agent({
          initialState: {
            systemPrompt: input.agent.systemPrompt,
            model,
            messages: toPiHistory(input, model),
            tools: input.agent.tools.map((tool) =>
              toPiTool(tool, {
                conversationId: input.conversationId,
                agentId: input.agent.id,
              }),
            ),
          },
          streamFn: models.streamSimple.bind(models),
          sessionId: input.conversationId,
          toolExecution: "sequential",
          ...(this.options.apiKey === undefined
            ? {}
            : { getApiKey: () => this.options.apiKey }),
        });

        const toolStartedAt = new Map<string, number>();
        const toolsByName = new Map(
          input.agent.tools.map((tool) => [tool.name, tool]),
        );
        agent.subscribe((event) => {
          if (failed) return;
          const convertedEvents = convertPiEvent(
            event,
            base,
            toolStartedAt,
            toolsByName,
          );
          for (const converted of convertedEvents) {
            queue.push(converted);
            if (converted.type === "run.failed") failed = true;
          }
          const toolFailure = convertedEvents.find(
            (converted) => converted.type === "tool.failed",
          );
          if (toolFailure !== undefined) {
            failed = true;
            queue.push({
              ...base(),
              type: "run.failed",
              error: toolFailure.error,
              durationMs: Date.now() - startedAt,
            });
          }
        });
        await agent.prompt(lastMessage.content);
        if (!failed) {
          queue.push({
            ...base(),
            type: "run.completed",
            durationMs: Date.now() - startedAt,
          });
        }
      } catch (error) {
        failed = true;
        queue.push({
          ...base(),
          type: "run.failed",
          error: { code: "PI_RUNTIME_ERROR", message: errorMessage(error) },
          durationMs: Date.now() - startedAt,
        });
      } finally {
        queue.close();
      }
    };

    void execute();
    for await (const event of queue) yield event;
  }
}

function toPiHistory(input: AgentRunInput, model: Model<Api>): AgentMessage[] {
  return input.messages.slice(0, -1).flatMap((message): AgentMessage[] => {
    const timestamp = Date.parse(message.createdAt);
    if (message.role === "user") {
      return [{ role: "user", content: message.content, timestamp }];
    }
    if (message.role === "assistant") {
      return [
        {
          role: "assistant",
          content: [{ type: "text", text: message.content }],
          api: model.api,
          provider: model.provider,
          model: model.id,
          usage: emptyUsage,
          stopReason: "stop",
          timestamp,
        },
      ];
    }
    return [];
  });
}

function convertPiEvent(
  event: AgentEvent,
  base: () => RuntimeEventBase,
  toolStartedAt: Map<string, number>,
  toolsByName: ReadonlyMap<string, BusinessTool>,
): RuntimeEvent[] {
  if (
    event.type === "message_update" &&
    event.assistantMessageEvent.type === "text_delta"
  ) {
    return [
      {
        ...base(),
        type: "message.delta",
        delta: event.assistantMessageEvent.delta,
      },
    ];
  }
  if (event.type === "message_end" && event.message.role === "assistant") {
    const message = event.message;
    if (message.stopReason === "error" || message.stopReason === "aborted") {
      return [
        {
          ...base(),
          type: "run.failed",
          error: {
            code: "MODEL_ERROR",
            message: message.errorMessage ?? "Model request failed",
          },
          durationMs: 0,
        },
      ];
    }
    if (message.stopReason !== "toolUse") {
      const content = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
      return content === ""
        ? []
        : [{ ...base(), type: "message.completed", content }];
    }
  }
  if (event.type === "tool_execution_start") {
    toolStartedAt.set(event.toolCallId, Date.now());
    const tool = requireTool(event.toolName, toolsByName);
    const events: RuntimeEvent[] = toolObservationStarted(tool, base);
    events.push({
      ...base(),
      type: "tool.started",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      toolVersion: tool.version,
    });
    return events;
  }
  if (event.type === "tool_execution_end") {
    const tool = requireTool(event.toolName, toolsByName);
    const durationMs = toolDuration(event.toolCallId, toolStartedAt);
    if (event.isError) {
      const error = extractToolFailure(event.result);
      return [
        {
          ...base(),
          type: "tool.failed",
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          toolVersion: tool.version,
          error,
          durationMs,
        },
        ...toolObservationFailed(tool, error.code, durationMs, base),
      ];
    }
    const details = extractToolDetails(event.result);
    const events: RuntimeEvent[] = [
      {
        ...base(),
        type: "tool.completed",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        toolVersion: tool.version,
        result: details,
        durationMs,
      },
    ];
    events.push(...toolObservationCompleted(tool, details, durationMs, base));
    return events;
  }
  return [];
}

function requireTool(
  toolName: string,
  tools: ReadonlyMap<string, BusinessTool>,
): BusinessTool {
  const tool = tools.get(toolName);
  if (tool === undefined) throw new Error(`Unknown tool metadata: ${toolName}`);
  return tool;
}

function toolDuration(
  toolCallId: string,
  startedAt: Map<string, number>,
): number {
  const start = startedAt.get(toolCallId);
  startedAt.delete(toolCallId);
  return start === undefined ? 0 : Date.now() - start;
}

function extractToolDetails(result: unknown): unknown {
  if (typeof result === "object" && result !== null && "details" in result) {
    return result.details;
  }
  return result;
}

function extractToolFailure(result: unknown): {
  readonly code: string;
  readonly message: string;
} {
  const message = extractToolError(result);
  const parsed = parseSerializedToolError(message);
  return parsed ?? { code: "TOOL_EXECUTION_FAILED", message };
}

function extractToolError(result: unknown): string {
  if (typeof result === "object" && result !== null && "content" in result) {
    const content = result.content;
    if (Array.isArray(content)) {
      return content
        .filter(isTextPart)
        .map((part) => part.text)
        .join("");
    }
  }
  return "Tool execution failed";
}

function parseSerializedToolError(value: string):
  | {
      readonly code: string;
      readonly message: string;
    }
  | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "code" in parsed &&
      typeof parsed.code === "string" &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      return { code: parsed.code, message: parsed.message };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function isTextPart(part: unknown): part is { type: "text"; text: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "text" &&
    "text" in part &&
    typeof part.text === "string"
  );
}
