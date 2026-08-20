import { describe, expect, it } from "vitest";
import type { AgentDefinition } from "../../src/agents/agent-definition.js";
import type { AgentRuntime } from "../../src/runtime/agent-runtime.js";
import type { RuntimeEvent } from "../../src/runtime/runtime-events.js";

export interface RuntimeContractSubject {
  readonly runtime: AgentRuntime;
  readonly agent: AgentDefinition;
  readonly failureAgent: AgentDefinition;
}

export function runtimeContract(
  implementation: string,
  createSubject: () => RuntimeContractSubject,
): void {
  describe(`${implementation} AgentRuntime contract`, () => {
    it("emits the portable success event lifecycle", async () => {
      const { runtime, agent } = createSubject();
      const events = await collect(runtime, agent, "我的订单发货了吗？");
      const types = events.map(({ type }) => type);

      expect(types[0]).toBe("run.started");
      expect(types.at(-1)).toBe("run.completed");
      expect(types).toContain("message.delta");
      expect(types).toContain("tool.started");
      expect(types).toContain("tool.completed");
      expect(types).toContain("message.completed");
      expect(types).not.toContain("run.failed");

      expect(new Set(events.map(({ traceId }) => traceId)).size).toBe(1);
      expect(new Set(events.map(({ runId }) => runId)).size).toBe(1);
      expect(
        events.every(({ agentVersion }) => agentVersion === agent.version),
      ).toBe(true);
      expect(
        events
          .filter(
            (event) =>
              event.type === "tool.started" || event.type === "tool.completed",
          )
          .every(({ toolVersion }) => toolVersion === "1.0.0"),
      ).toBe(true);
    });

    it("ends failures with run.failed instead of throwing", async () => {
      const { runtime, failureAgent } = createSubject();
      const events = await collect(runtime, failureAgent, "我的订单发货了吗？");

      expect(events[0]?.type).toBe("run.started");
      expect(events.at(-1)?.type).toBe("run.failed");
      expect(events.some(({ type }) => type === "run.completed")).toBe(false);
    });

    it("assigns a unique trace to each run", async () => {
      const first = createSubject();
      const second = createSubject();
      const firstEvents = await collect(
        first.runtime,
        first.agent,
        "我的订单发货了吗？",
      );
      const secondEvents = await collect(
        second.runtime,
        second.agent,
        "我的订单发货了吗？",
      );

      expect(firstEvents[0]?.traceId).toBeTruthy();
      expect(secondEvents[0]?.traceId).toBeTruthy();
      expect(firstEvents[0]?.traceId).not.toBe(secondEvents[0]?.traceId);
    });
  });
}

async function collect(
  runtime: AgentRuntime,
  agent: AgentDefinition,
  content: string,
): Promise<RuntimeEvent[]> {
  const events: RuntimeEvent[] = [];
  for await (const event of runtime.run({
    conversationId: "conversation_contract",
    agent,
    messages: [{ role: "user", content, createdAt: new Date().toISOString() }],
    context: {},
  })) {
    events.push(event);
  }
  return events;
}
