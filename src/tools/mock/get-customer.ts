import type { BusinessTool } from "../tool.js";
import type {
  Customer,
  CustomerProvider,
} from "../../business/customer/customer-provider.js";
import { sandboxCustomerProvider } from "../../business/customer/providers/sandbox/sandbox-customer-provider.js";

export function createGetCustomerTool(
  provider: CustomerProvider,
): BusinessTool<{ customerId: string }, Customer> {
  return {
    name: "get_customer",
    version: "1.0.0",
    description: "根据客户 ID 获取客户基础资料。",
    permissions: ["customer:read"],
    inputSchema: {
      type: "object",
      properties: { customerId: { type: "string", description: "客户 ID" } },
      required: ["customerId"],
      additionalProperties: false,
    },
    async execute(input) {
      const customer = await provider.getCustomer(input.customerId);
      if (customer === undefined) {
        return {
          ok: false,
          error: { code: "CUSTOMER_NOT_FOUND", message: "客户不存在" },
        };
      }
      return { ok: true, data: customer };
    },
  };
}

export const getCustomerTool = createGetCustomerTool(sandboxCustomerProvider);
