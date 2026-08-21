import type { Customer, CustomerProvider } from "../../customer-provider.js";

const sandboxCustomer: Customer = {
  id: "customer_001",
  name: "张三",
  tier: "standard",
};

export class SandboxCustomerProvider implements CustomerProvider {
  async getCustomer(customerId: string): Promise<Customer | undefined> {
    return customerId === sandboxCustomer.id
      ? structuredClone(sandboxCustomer)
      : undefined;
  }
}

export const sandboxCustomerProvider = new SandboxCustomerProvider();
