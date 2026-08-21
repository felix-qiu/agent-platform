import { describe, expect, it } from "vitest";
import { m2GroundingSet } from "../evals/datasets/m2-grounding-set.js";
import { runEvaluationCase } from "../evals/runner/evaluation-runner.js";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";

describe("M2 grounding evaluation", () => {
  it("grounds knowledge and business answers in the expected Tools", async () => {
    const agent = createCustomerServiceAgent();
    const results = await Promise.all(
      m2GroundingSet.map((evaluationCase) =>
        runEvaluationCase(new FakeRuntime(), agent, evaluationCase),
      ),
    );

    expect(results).toHaveLength(4);
    expect(results.filter(({ passed }) => !passed)).toEqual([]);
  });
});
