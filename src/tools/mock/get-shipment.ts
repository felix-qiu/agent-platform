import type { BusinessTool } from "../tool.js";
import type {
  OrderProvider,
  Shipment,
} from "../../business/order/order-provider.js";
import { sandboxOrderProvider } from "../../business/order/providers/sandbox/sandbox-order-provider.js";

export function createGetShipmentTool(
  provider: OrderProvider,
): BusinessTool<{ orderId: string }, Shipment> {
  return {
    name: "get_shipment",
    version: "1.0.0",
    description: "根据订单 ID 获取承运商、运单号和最新物流状态。",
    permissions: ["shipment:read"],
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string", description: "订单 ID" } },
      required: ["orderId"],
      additionalProperties: false,
    },
    async execute(input) {
      const shipment = await provider.getShipment(input.orderId);
      if (shipment === undefined) {
        return {
          ok: false,
          error: { code: "SHIPMENT_NOT_FOUND", message: "物流信息不存在" },
        };
      }
      return { ok: true, data: shipment };
    },
  };
}

export const getShipmentTool = createGetShipmentTool(sandboxOrderProvider);
