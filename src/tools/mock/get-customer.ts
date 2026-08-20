import type { BusinessTool } from "../tool.js";
import { mockCustomer } from "./data.js";

export const getCustomerTool: BusinessTool<
  { customerId: string },
  typeof mockCustomer
> = {
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
    if (input.customerId !== mockCustomer.id) {
      return {
        ok: false,
        error: { code: "CUSTOMER_NOT_FOUND", message: "客户不存在" },
      };
    }
    return { ok: true, data: mockCustomer };
  },
};
