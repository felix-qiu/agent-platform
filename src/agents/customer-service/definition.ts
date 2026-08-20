import type { AgentDefinition } from "../agent-definition.js";
import { mockBusinessTools } from "../../tools/mock/index.js";
import { customerServicePrompt } from "./prompt.js";

export function createCustomerServiceAgent(
  model: AgentDefinition["model"] = {
    provider: process.env.LLM_PROVIDER ?? "openai",
    id: process.env.LLM_MODEL ?? "gpt-4o-mini",
  },
): AgentDefinition {
  return {
    id: "customer-service",
    name: "Customer Service Agent",
    systemPrompt: customerServicePrompt,
    model,
    tools: mockBusinessTools,
    version: "1.0.0-m1",
  };
}
