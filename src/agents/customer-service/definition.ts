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
    version: "1.0.0",
    systemPrompt: customerServicePrompt,
    model,
    tools: mockBusinessTools,
    permissions: ["customer:read", "order:read", "shipment:read"],
    policies: [
      "ground-business-facts-in-tools",
      "report-tool-failures-honestly",
      "never-claim-unexecuted-actions",
    ],
  };
}
