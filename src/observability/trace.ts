import type { RuntimeEvent } from "../runtime/runtime-events.js";

export interface Trace {
  readonly traceId: string;
  readonly conversationId: string;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly events: readonly RuntimeEvent[];
  readonly createdAt: string;
}

export interface TraceRepository {
  createTrace(trace: Trace): Promise<Trace>;
  appendEvent(traceId: string, event: RuntimeEvent): Promise<Trace>;
  getTrace(traceId: string): Promise<Trace | undefined>;
}

export function newTrace(event: RuntimeEvent): Trace {
  return {
    traceId: event.traceId,
    conversationId: event.conversationId,
    agentId: event.agentId,
    agentVersion: event.agentVersion,
    events: [],
    createdAt: event.timestamp,
  };
}
