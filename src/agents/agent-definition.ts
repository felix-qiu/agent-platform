import type { BusinessTool } from "../tools/tool.js";

export interface AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly model: { readonly provider: string; readonly id: string };
  readonly tools: readonly BusinessTool[];
  readonly version: string;
}
