import { describe, expect, it } from "vitest";
import { SandboxCustomerProvider } from "../src/business/customer/providers/sandbox/sandbox-customer-provider.js";
import { SandboxOrderProvider } from "../src/business/order/providers/sandbox/sandbox-order-provider.js";

describe("Sandbox Business Providers", () => {
  it("serves deterministic customer data through CustomerProvider", async () => {
    const provider = new SandboxCustomerProvider();
    await expect(provider.getCustomer("customer_001")).resolves.toMatchObject({
      id: "customer_001",
      name: "张三",
    });
    await expect(provider.getCustomer("missing")).resolves.toBeUndefined();
  });

  it("serves order and shipment facts through OrderProvider", async () => {
    const provider = new SandboxOrderProvider();
    await expect(provider.getOrders("customer_001")).resolves.toHaveLength(2);
    await expect(provider.getOrder("order_001")).resolves.toMatchObject({
      status: "shipped",
    });
    await expect(provider.getShipment("order_001")).resolves.toMatchObject({
      carrier: "顺丰速运",
      status: "in_transit",
    });
  });
});
