import type { BusinessTool } from "../tool.js";
import { mockShipment } from "./data.js";

export const getShipmentTool: BusinessTool<
  { orderId: string },
  typeof mockShipment
> = {
  name: "get_shipment",
  description: "根据订单 ID 获取承运商、运单号和最新物流状态。",
  inputSchema: {
    type: "object",
    properties: { orderId: { type: "string", description: "订单 ID" } },
    required: ["orderId"],
    additionalProperties: false,
  },
  async execute(input) {
    if (input.orderId !== mockShipment.orderId) {
      return {
        ok: false,
        error: { code: "SHIPMENT_NOT_FOUND", message: "物流信息不存在" },
      };
    }
    return { ok: true, data: mockShipment };
  },
};
