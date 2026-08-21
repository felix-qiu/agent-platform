export type ExpectedOutcome = "completed" | "failed";

export interface EvaluationCase {
  readonly id: string;
  readonly category:
    "knowledge" | "order" | "multi_turn" | "tool_failure" | "human_request";
  readonly input: readonly string[];
  readonly expectedTools: readonly string[];
  readonly expectedOutcome: ExpectedOutcome;
  readonly expectedAnswerIncludes?: readonly string[];
  readonly expectedAnswerExcludes?: readonly string[];
  readonly setup?: { readonly failTool?: string };
}
