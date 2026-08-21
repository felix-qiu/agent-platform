import { randomUUID } from "node:crypto";
import type { BusinessTool } from "../tools/tool.js";
import type { AgentRuntime, AgentRunInput } from "./agent-runtime.js";
import type { RuntimeEvent, RuntimeEventBase } from "./runtime-events.js";

export class FakeRuntime implements AgentRuntime {
  async *run(input: AgentRunInput): AsyncIterable<RuntimeEvent> {
    const startedAt = Date.now();
    const runId = randomUUID();
    const traceId = randomUUID();
    const base = (): RuntimeEventBase => ({
      runId,
      traceId,
      conversationId: input.conversationId,
      agentId: input.agent.id,
      agentVersion: input.agent.version,
      timestamp: new Date().toISOString(),
    });
    yield { ...base(), type: "run.started" };

    try {
      const question = input.messages.at(-1)?.content ?? "";
      if (isKnowledgeQuestion(question)) {
        const knowledge = await this.callTool(
          input,
          "search_knowledge",
          { query: question },
          base,
        );
        yield* knowledge.events;
        assertToolSucceeded(knowledge);

        const answer = groundedKnowledgeAnswer(knowledge.result);
        yield { ...base(), type: "message.delta", delta: answer };
        yield { ...base(), type: "message.completed", content: answer };
      } else if (
        question.includes("订单") ||
        question.includes("发货") ||
        question.includes("物流")
      ) {
        const orders = await this.callTool(
          input,
          "get_orders",
          { customerId: "customer_001" },
          base,
        );
        yield* orders.events;
        assertToolSucceeded(orders);

        const order = await this.callTool(
          input,
          "get_order",
          { orderId: "order_001" },
          base,
        );
        yield* order.events;
        assertToolSucceeded(order);

        const shipment = await this.callTool(
          input,
          "get_shipment",
          { orderId: "order_001" },
          base,
        );
        yield* shipment.events;
        assertToolSucceeded(shipment);

        const answer =
          "您的订单 order_001 已发货，承运商为顺丰速运，当前运输中，最新进展：包裹已离开上海转运中心。";
        yield { ...base(), type: "message.delta", delta: answer.slice(0, 24) };
        yield { ...base(), type: "message.delta", delta: answer.slice(24) };
        yield { ...base(), type: "message.completed", content: answer };
      } else {
        const answer = "您好，请告诉我需要查询的订单或物流问题。";
        yield { ...base(), type: "message.delta", delta: answer };
        yield { ...base(), type: "message.completed", content: answer };
      }
      yield {
        ...base(),
        type: "run.completed",
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      yield {
        ...base(),
        type: "run.failed",
        error: normalizeFakeRuntimeError(error),
        durationMs: Date.now() - startedAt,
      };
    }
  }

  private async callTool(
    input: AgentRunInput,
    name: string,
    args: unknown,
    base: () => RuntimeEventBase,
  ): Promise<ToolCallEvents> {
    const tool = input.agent.tools.find((candidate) => candidate.name === name);
    if (tool === undefined)
      throw new Error(`FakeRuntime requires tool ${name}`);
    const toolCallId = randomUUID();
    const startedAt = Date.now();
    const events: RuntimeEvent[] = [];
    if (tool.observability?.kind === "knowledge.search") {
      events.push({
        ...base(),
        type: "knowledge.search.started",
        provider: tool.observability.provider,
      });
    }
    events.push({
      ...base(),
      type: "tool.started",
      toolCallId,
      toolName: name,
      toolVersion: tool.version,
    });
    const result = await executeUnknownTool(tool, args, input);
    events.push(
      result.ok
        ? {
            ...base(),
            type: "tool.completed",
            toolCallId,
            toolName: name,
            toolVersion: tool.version,
            result,
            durationMs: Date.now() - startedAt,
          }
        : {
            ...base(),
            type: "tool.failed",
            toolCallId,
            toolName: name,
            toolVersion: tool.version,
            error: result.error,
            durationMs: Date.now() - startedAt,
          },
    );
    if (result.ok && tool.observability?.kind === "knowledge.search") {
      events.push({
        ...base(),
        type: "knowledge.search.completed",
        provider: tool.observability.provider,
        matches: extractKnowledgeMatches(result),
        durationMs: Date.now() - startedAt,
      });
    }
    return result.ok
      ? { ok: true, events, result }
      : { ok: false, events, error: result.error };
  }
}

type ToolCallEvents =
  | {
      readonly ok: true;
      readonly events: RuntimeEvent[];
      readonly result: { readonly ok: true; readonly data: unknown };
    }
  | {
      readonly ok: false;
      readonly events: RuntimeEvent[];
      readonly error: { readonly code: string; readonly message: string };
    };

class FakeToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function assertToolSucceeded(result: ToolCallEvents): asserts result is {
  ok: true;
  events: RuntimeEvent[];
  result: { ok: true; data: unknown };
} {
  if (!result.ok)
    throw new FakeToolError(result.error.code, result.error.message);
}

function isKnowledgeQuestion(question: string): boolean {
  return ["密码", "手机号", "政策", "怎么修改", "如何修改"].some((keyword) =>
    question.includes(keyword),
  );
}

function groundedKnowledgeAnswer(result: { readonly data: unknown }): string {
  const matches = extractKnowledgeResults(result);
  const first = matches[0];
  return first === undefined
    ? "暂未找到相关企业知识，我无法确认该问题，请联系人工客服获取帮助。"
    : `根据企业知识《${first.title}》：${first.content}`;
}

function extractKnowledgeMatches(result: { readonly data: unknown }) {
  return extractKnowledgeResults(result).map(({ id, source, score }) => ({
    id,
    source,
    score,
  }));
}

interface GroundedKnowledgeResult {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly score: number;
}

function extractKnowledgeResults(result: {
  readonly data: unknown;
}): GroundedKnowledgeResult[] {
  if (
    typeof result.data !== "object" ||
    result.data === null ||
    !("results" in result.data)
  ) {
    return [];
  }
  const results = result.data.results;
  return Array.isArray(results)
    ? results.filter(isGroundedKnowledgeResult)
    : [];
}

function isGroundedKnowledgeResult(
  value: unknown,
): value is GroundedKnowledgeResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "content" in value &&
    typeof value.content === "string" &&
    "source" in value &&
    typeof value.source === "string" &&
    "score" in value &&
    typeof value.score === "number"
  );
}

function normalizeFakeRuntimeError(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof FakeToolError)
    return { code: error.code, message: error.message };
  return {
    code: "FAKE_RUNTIME_ERROR",
    message:
      error instanceof Error ? error.message : "Unknown fake runtime error",
  };
}

async function executeUnknownTool(
  tool: BusinessTool,
  args: unknown,
  input: AgentRunInput,
) {
  return tool.execute(args, {
    conversationId: input.conversationId,
    agentId: input.agent.id,
  });
}
