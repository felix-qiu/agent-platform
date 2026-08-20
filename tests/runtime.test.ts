import { describe, expect, it } from "vitest";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";
import type {
  AgentRuntime,
  AgentRunInput,
} from "../src/runtime/agent-runtime.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";
import type { RuntimeEvent } from "../src/runtime/runtime-events.js";

describe("AgentRuntime contract", () => {
  it("can be implemented without Pi types", async () => {
    class MinimalRuntime implements AgentRuntime {
      async *run(input: AgentRunInput): AsyncIterable<RuntimeEvent> {
        const base = {
          runId: "run_1",
          conversationId: input.conversationId,
          agentId: input.agent.id,
          timestamp: new Date(0).toISOString(),
        };
        yield { ...base, type: "run.started", agentId: input.agent.id };
        yield { ...base, type: "run.completed", durationMs: 1 };
      }
    }

    const events = [];
    for await (const event of new MinimalRuntime().run({
      conversationId: "conversation_1",
      agent: createCustomerServiceAgent(),
      messages: [],
      context: {},
    })) {
      events.push(event.type);
    }
    expect(events).toEqual(["run.started", "run.completed"]);
  });

  it("fake runtime performs a deterministic tool-call loop", async () => {
    const events = [];
    for await (const event of new FakeRuntime().run({
      conversationId: "conversation_1",
      agent: createCustomerServiceAgent(),
      messages: [
        {
          role: "user",
          content: "我的订单发货了吗？",
          createdAt: new Date().toISOString(),
        },
      ],
      context: {},
    })) {
      events.push(event);
    }
    expect(
      events
        .filter(({ type }) => type === "tool.completed")
        .map((event) => ("toolName" in event ? event.toolName : "")),
    ).toEqual(["get_orders", "get_order", "get_shipment"]);
    expect(events.some(({ type }) => type === "message.delta")).toBe(true);
  });
});
