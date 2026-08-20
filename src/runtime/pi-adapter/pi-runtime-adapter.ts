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
import { errorMessage } from "../../shared/errors.js";
import { toPiTool } from "./pi-tool-adapter.js";
import { AsyncEventQueue } from "./async-event-queue.js";

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
        const toolVersions = new Map(
          input.agent.tools.map((tool) => [tool.name, tool.version]),
        );
        agent.subscribe((event) => {
          for (const converted of convertPiEvent(
            event,
            base,
            toolStartedAt,
            toolVersions,
          )) {
            if (converted.type === "run.failed") failed = true;
            queue.push(converted);
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
  toolVersions: ReadonlyMap<string, string>,
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
    return [
      {
        ...base(),
        type: "tool.started",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        toolVersion: requireToolVersion(event.toolName, toolVersions),
      },
    ];
  }
  if (event.type === "tool_execution_end") {
    if (event.isError) {
      return [
        {
          ...base(),
          type: "tool.failed",
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          toolVersion: requireToolVersion(event.toolName, toolVersions),
          error: {
            code: "TOOL_EXECUTION_FAILED",
            message: extractToolError(event.result),
          },
          durationMs: toolDuration(event.toolCallId, toolStartedAt),
        },
      ];
    }
    return [
      {
        ...base(),
        type: "tool.completed",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        toolVersion: requireToolVersion(event.toolName, toolVersions),
        result: extractToolDetails(event.result),
        durationMs: toolDuration(event.toolCallId, toolStartedAt),
      },
    ];
  }
  return [];
}

function requireToolVersion(
  toolName: string,
  versions: ReadonlyMap<string, string>,
): string {
  const version = versions.get(toolName);
  if (version === undefined)
    throw new Error(`Unknown tool version: ${toolName}`);
  return version;
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
