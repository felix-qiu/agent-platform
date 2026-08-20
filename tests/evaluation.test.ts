import { describe, expect, it } from "vitest";
import { m11GoldenSet } from "../evals/datasets/m1-1-golden-set.js";
import { runEvaluationCase } from "../evals/runner/evaluation-runner.js";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";

describe("M1.1 evaluation skeleton", () => {
  it("contains the five required Golden Set categories", () => {
    expect(new Set(m11GoldenSet.map(({ category }) => category))).toEqual(
      new Set([
        "knowledge",
        "order",
        "multi_turn",
        "tool_failure",
        "human_request",
      ]),
    );
  });

  it("runs the Golden Set deterministically with FakeRuntime", async () => {
    const agent = createCustomerServiceAgent();
    const results = await Promise.all(
      m11GoldenSet.map((evaluationCase) =>
        runEvaluationCase(new FakeRuntime(), agent, evaluationCase),
      ),
    );

    expect(results).toHaveLength(5);
    expect(results.filter(({ passed }) => !passed)).toEqual([]);
  });
});
