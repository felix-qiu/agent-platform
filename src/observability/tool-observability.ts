import type {
  RuntimeEvent,
  RuntimeEventBase,
} from "../runtime/runtime-events.js";
import type { BusinessTool, ToolResult } from "../tools/tool.js";

export function toolObservationStarted(
  tool: BusinessTool,
  base: () => RuntimeEventBase,
): RuntimeEvent[] {
  const provider = knowledgeProvider(tool);
  return provider === undefined
    ? []
    : [{ ...base(), type: "knowledge.search.started", provider }];
}

export function toolObservationCompleted(
  tool: BusinessTool,
  result: unknown,
  durationMs: number,
  base: () => RuntimeEventBase,
): RuntimeEvent[] {
  const provider = knowledgeProvider(tool);
  return provider === undefined
    ? []
    : [
        {
          ...base(),
          type: "knowledge.search.completed",
          provider,
          matches: extractKnowledgeMatches(result),
          durationMs,
        },
      ];
}

export function toolObservationFailed(
  tool: BusinessTool,
  errorCode: string,
  durationMs: number,
  base: () => RuntimeEventBase,
): RuntimeEvent[] {
  const provider = knowledgeProvider(tool);
  return provider === undefined
    ? []
    : [
        {
          ...base(),
          type: "knowledge.search.failed",
          provider,
          errorCode,
          durationMs,
        },
      ];
}

function knowledgeProvider(tool: BusinessTool): string | undefined {
  if (tool.observability?.namespace !== "knowledge.search") return undefined;
  const provider = tool.observability.attributes.provider;
  return typeof provider === "string" ? provider : undefined;
}

function extractKnowledgeMatches(result: unknown) {
  const data = toolResultData(result);
  if (typeof data !== "object" || data === null || !("results" in data)) {
    return [];
  }
  return Array.isArray(data.results)
    ? data.results.filter(isKnowledgeMatch).map(({ id, source, score }) => ({
        id,
        source,
        score,
      }))
    : [];
}

function toolResultData(result: unknown): unknown {
  if (isSuccessfulToolResult(result)) return result.data;
  if (typeof result === "object" && result !== null && "data" in result) {
    return result.data;
  }
  return undefined;
}

function isSuccessfulToolResult(
  value: unknown,
): value is Extract<ToolResult<unknown>, { readonly ok: true }> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "data" in value
  );
}

function isKnowledgeMatch(value: unknown): value is {
  readonly id: string;
  readonly source: string;
  readonly score: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "source" in value &&
    typeof value.source === "string" &&
    "score" in value &&
    typeof value.score === "number"
  );
}
