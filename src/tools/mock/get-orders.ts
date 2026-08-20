import type { BusinessTool } from "../tool.js";
import { mockCustomer, mockOrders } from "./data.js";

export const getOrdersTool: BusinessTool<
  { customerId: string },
  { orders: typeof mockOrders }
> = {
  name: "get_orders",
  version: "1.0.0",
  description: "获取指定客户的订单列表。",
  permissions: ["order:read"],
  inputSchema: {
    type: "object",
    properties: { customerId: { type: "string", description: "客户 ID" } },
    required: ["customerId"],
    additionalProperties: false,
  },
  async execute(input) {
    if (input.customerId !== mockCustomer.id) {
      return {
        ok: false,
        error: { code: "CUSTOMER_NOT_FOUND", message: "客户不存在" },
      };
    }
    return { ok: true, data: { orders: mockOrders } };
  },
};
