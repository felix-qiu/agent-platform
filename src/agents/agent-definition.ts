import type { BusinessTool } from "../tools/tool.js";

export interface AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly systemPrompt: string;
  readonly model: { readonly provider: string; readonly id: string };
  readonly tools: readonly BusinessTool[];
  readonly permissions: readonly string[];
  readonly policies: readonly string[];
}
