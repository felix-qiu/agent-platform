import type { BusinessTool } from "../tool.js";
import type {
  Order,
  OrderProvider,
} from "../../business/order/order-provider.js";
import { sandboxOrderProvider } from "../../business/order/providers/sandbox/sandbox-order-provider.js";

export function createGetOrdersTool(
  provider: OrderProvider,
): BusinessTool<{ customerId: string }, { orders: readonly Order[] }> {
  return {
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
      const orders = await provider.getOrders(input.customerId);
      if (orders === undefined) {
        return {
          ok: false,
          error: { code: "CUSTOMER_NOT_FOUND", message: "客户不存在" },
        };
      }
      return { ok: true, data: { orders } };
    },
  };
}

export const getOrdersTool = createGetOrdersTool(sandboxOrderProvider);
