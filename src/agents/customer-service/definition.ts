import type { AgentDefinition } from "../agent-definition.js";
import type { KnowledgeProvider } from "../../knowledge/knowledge-provider.js";
import {
  mockKnowledgeProvider,
  createSearchKnowledgeTool,
} from "../../tools/knowledge/search-knowledge.js";
import { sandboxBusinessTools } from "../../tools/mock/index.js";
import { customerServicePrompt } from "./prompt.js";

export function createCustomerServiceAgent(
  model: AgentDefinition["model"] = {
    provider: process.env.LLM_PROVIDER ?? "openai",
    id: process.env.LLM_MODEL ?? "gpt-4o-mini",
  },
  knowledgeProvider: KnowledgeProvider = mockKnowledgeProvider,
): AgentDefinition {
  return {
    id: "customer-service",
    name: "Customer Service Agent",
    version: "2.0.0",
    systemPrompt: customerServicePrompt,
    model,
    tools: [
      ...sandboxBusinessTools,
      createSearchKnowledgeTool(knowledgeProvider),
    ],
    permissions: [
      "customer:read",
      "order:read",
      "shipment:read",
      "knowledge:read",
    ],
    policies: [
      "ground-business-facts-in-tools",
      "report-tool-failures-honestly",
      "never-claim-unexecuted-actions",
      "prefer-knowledge-over-model-memory",
    ],
  };
}
