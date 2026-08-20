import type { BusinessTool } from "../tool.js";
import { mockOrders } from "./data.js";

type MockOrder = (typeof mockOrders)[number];

export const getOrderTool: BusinessTool<{ orderId: string }, MockOrder> = {
  name: "get_order",
  description: "根据订单 ID 获取订单详情与状态。",
  inputSchema: {
    type: "object",
    properties: { orderId: { type: "string", description: "订单 ID" } },
    required: ["orderId"],
    additionalProperties: false,
  },
  async execute(input) {
    const order = mockOrders.find(({ id }) => id === input.orderId);
    return order
      ? { ok: true, data: order }
      : {
          ok: false,
          error: { code: "ORDER_NOT_FOUND", message: "订单不存在" },
        };
  },
};
