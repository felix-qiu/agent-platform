import { createCustomerServiceAgent } from "../../src/agents/customer-service/index.js";
import { FakeRuntime } from "../../src/runtime/fake-runtime.js";
import { runtimeContract } from "./runtime-contract.js";

runtimeContract("FakeRuntime", () => {
  const agent = createCustomerServiceAgent();
  return {
    runtime: new FakeRuntime(),
    agent,
    failureAgent: { ...agent, tools: [] },
  };
});
