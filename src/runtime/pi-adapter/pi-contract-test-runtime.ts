import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxToolCall,
} from "@earendil-works/pi-ai";
import type { AgentRuntime } from "../agent-runtime.js";
import { PiRuntimeAdapter } from "./pi-runtime-adapter.js";

export interface PiContractTestRuntime {
  readonly runtime: AgentRuntime;
  readonly model: { readonly provider: string; readonly id: string };
}

export function createPiContractTestRuntime(): PiContractTestRuntime {
  const faux = fauxProvider({
    provider: "agent-platform-contract",
    models: [{ id: "contract-model", name: "Contract Model" }],
    tokensPerSecond: 10_000,
  });
  faux.setResponses([
    fauxAssistantMessage(
      fauxToolCall("get_orders", { customerId: "customer_001" }),
      { stopReason: "toolUse" },
    ),
    fauxAssistantMessage("订单已查询并完成回复。"),
  ]);

  const models = createModels();
  models.setProvider(faux.provider);
  const model = faux.getModel();
  return {
    runtime: new PiRuntimeAdapter({}, () => models),
    model: { provider: model.provider, id: model.id },
  };
}
