import type { AgentDefinition } from "../../src/agents/agent-definition.js";
import type {
  AgentRuntime,
  AgentRuntimeMessage,
} from "../../src/runtime/agent-runtime.js";
import type { BusinessTool } from "../../src/tools/tool.js";
import type {
  EvaluationCase,
  ExpectedOutcome,
} from "../cases/evaluation-case.js";

export interface EvaluationResult {
  readonly caseId: string;
  readonly passed: boolean;
  readonly actualTools: readonly string[];
  readonly actualOutcome: ExpectedOutcome;
}

export async function runEvaluationCase(
  runtime: AgentRuntime,
  baseAgent: AgentDefinition,
  evaluationCase: EvaluationCase,
): Promise<EvaluationResult> {
  const agent = withEvaluationSetup(baseAgent, evaluationCase);
  const actualTools: string[] = [];
  let actualOutcome: ExpectedOutcome = "failed";

  for await (const event of runtime.run({
    conversationId: `eval_${evaluationCase.id}`,
    agent,
    messages: evaluationMessages(evaluationCase.input),
    context: { evaluationCaseId: evaluationCase.id },
  })) {
    if (event.type === "tool.started") actualTools.push(event.toolName);
    if (event.type === "run.completed") actualOutcome = "completed";
    if (event.type === "run.failed") actualOutcome = "failed";
  }

  return {
    caseId: evaluationCase.id,
    passed:
      arraysEqual(actualTools, evaluationCase.expectedTools) &&
      actualOutcome === evaluationCase.expectedOutcome,
    actualTools,
    actualOutcome,
  };
}

function evaluationMessages(input: readonly string[]): AgentRuntimeMessage[] {
  return input.map((content) => ({
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  }));
}

function withEvaluationSetup(
  agent: AgentDefinition,
  evaluationCase: EvaluationCase,
): AgentDefinition {
  const failTool = evaluationCase.setup?.failTool;
  if (failTool === undefined) return agent;
  return {
    ...agent,
    tools: agent.tools.map((tool) =>
      tool.name === failTool ? failingTool(tool) : tool,
    ),
  };
}

function failingTool(tool: BusinessTool): BusinessTool {
  return {
    ...tool,
    async execute() {
      return {
        ok: false,
        error: {
          code: "EVAL_TOOL_FAILURE",
          message: "Evaluation-injected failure",
        },
      };
    },
  };
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
