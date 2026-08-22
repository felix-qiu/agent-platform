import { Type, type TSchema } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { BusinessTool, ToolExecutionContext } from "../../tools/tool.js";
import { RuntimeError } from "../../shared/errors.js";

export function toPiTool(
  tool: BusinessTool,
  context: ToolExecutionContext,
): AgentTool<TSchema, unknown> {
  return {
    name: tool.name,
    label: tool.name,
    description: tool.description,
    parameters: Type.Unsafe(tool.inputSchema),
    async execute(_toolCallId, params, signal) {
      const result = await tool.execute(params, {
        ...context,
        ...(signal === undefined ? {} : { signal }),
      });
      if (!result.ok) {
        throw new RuntimeError(result.error.code, JSON.stringify(result.error));
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
      };
    },
  };
}
