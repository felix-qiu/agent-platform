import { createCustomerServiceAgent } from "../../src/agents/customer-service/index.js";
import { createPiContractTestRuntime } from "../../src/runtime/pi-adapter/pi-contract-test-runtime.js";
import { runtimeContract } from "./runtime-contract.js";

runtimeContract("PiRuntimeAdapter", () => {
  const subject = createPiContractTestRuntime();
  const agent = createCustomerServiceAgent(subject.model);
  return {
    runtime: subject.runtime,
    agent,
    failureAgent: { ...agent, model: { ...agent.model, id: "missing-model" } },
  };
});
