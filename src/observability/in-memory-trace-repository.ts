import { AppError } from "../shared/errors.js";
import type { RuntimeEvent } from "../runtime/runtime-events.js";
import type { Trace, TraceRepository } from "./trace.js";

export class InMemoryTraceRepository implements TraceRepository {
  private readonly traces = new Map<string, Trace>();

  async createTrace(trace: Trace): Promise<Trace> {
    if (this.traces.has(trace.traceId)) {
      throw new AppError("TRACE_EXISTS", "Trace already exists", 409);
    }
    const stored = structuredClone(trace);
    this.traces.set(trace.traceId, stored);
    return structuredClone(stored);
  }

  async appendEvent(traceId: string, event: RuntimeEvent): Promise<Trace> {
    const trace = this.traces.get(traceId);
    if (trace === undefined) {
      throw new AppError("TRACE_NOT_FOUND", "Trace not found", 404);
    }
    if (event.traceId !== traceId) {
      throw new AppError(
        "TRACE_EVENT_MISMATCH",
        "Event belongs to another trace",
        400,
      );
    }
    const updated: Trace = {
      ...trace,
      events: [...trace.events, structuredClone(event)],
    };
    this.traces.set(traceId, updated);
    return structuredClone(updated);
  }

  async getTrace(traceId: string): Promise<Trace | undefined> {
    const trace = this.traces.get(traceId);
    return trace === undefined ? undefined : structuredClone(trace);
  }
}
