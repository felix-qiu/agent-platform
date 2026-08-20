import { randomUUID } from "node:crypto";
import type { BusinessTool } from "../tools/tool.js";
import type { AgentRuntime, AgentRunInput } from "./agent-runtime.js";
import type { RuntimeEvent, RuntimeEventBase } from "./runtime-events.js";

export class FakeRuntime implements AgentRuntime {
  async *run(input: AgentRunInput): AsyncIterable<RuntimeEvent> {
    const startedAt = Date.now();
    const runId = randomUUID();
    const base = (): RuntimeEventBase => ({
      runId,
      conversationId: input.conversationId,
      agentId: input.agent.id,
      timestamp: new Date().toISOString(),
    });
    yield { ...base(), type: "run.started", agentId: input.agent.id };

    const question = input.messages.at(-1)?.content ?? "";
    if (
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
      const order = await this.callTool(
        input,
        "get_order",
        { orderId: "order_001" },
        base,
      );
      yield* order.events;
      const shipment = await this.callTool(
        input,
        "get_shipment",
        { orderId: "order_001" },
        base,
      );
      yield* shipment.events;
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
  }

  private async callTool(
    input: AgentRunInput,
    name: string,
    args: unknown,
    base: () => RuntimeEventBase,
  ): Promise<{ events: RuntimeEvent[] }> {
    const tool = input.agent.tools.find((candidate) => candidate.name === name);
    if (tool === undefined)
      throw new Error(`FakeRuntime requires tool ${name}`);
    const toolCallId = randomUUID();
    const startedAt = Date.now();
    const events: RuntimeEvent[] = [
      { ...base(), type: "tool.started", toolCallId, toolName: name },
    ];
    const result = await executeUnknownTool(tool, args, input);
    events.push(
      result.ok
        ? {
            ...base(),
            type: "tool.completed",
            toolCallId,
            toolName: name,
            result,
            durationMs: Date.now() - startedAt,
          }
        : {
            ...base(),
            type: "tool.failed",
            toolCallId,
            toolName: name,
            error: result.error,
            durationMs: Date.now() - startedAt,
          },
    );
    return { events };
  }
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
