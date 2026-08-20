import { describe, expect, it } from "vitest";
import { InMemoryTraceRepository } from "../src/observability/in-memory-trace-repository.js";
import { newTrace } from "../src/observability/trace.js";
import type { RuntimeEvent } from "../src/runtime/runtime-events.js";

const startedEvent: RuntimeEvent = {
  type: "run.started",
  runId: "run_1",
  traceId: "trace_1",
  conversationId: "conversation_1",
  agentId: "customer-service",
  agentVersion: "1.0.0",
  timestamp: new Date(0).toISOString(),
};

describe("InMemoryTraceRepository", () => {
  it("stores versioned runtime events under a trace ID", async () => {
    const repository = new InMemoryTraceRepository();
    await repository.createTrace(newTrace(startedEvent));
    await repository.appendEvent(startedEvent.traceId, startedEvent);

    const trace = await repository.getTrace(startedEvent.traceId);
    expect(trace).toMatchObject({
      traceId: "trace_1",
      conversationId: "conversation_1",
      agentId: "customer-service",
      agentVersion: "1.0.0",
    });
    expect(trace?.events).toEqual([startedEvent]);
  });

  it("rejects events assigned to another trace", async () => {
    const repository = new InMemoryTraceRepository();
    await repository.createTrace(newTrace(startedEvent));

    await expect(
      repository.appendEvent(startedEvent.traceId, {
        ...startedEvent,
        traceId: "trace_2",
      }),
    ).rejects.toMatchObject({ code: "TRACE_EVENT_MISMATCH" });
  });
});
