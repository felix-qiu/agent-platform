import { describe, expect, it } from "vitest";
import { getCustomerTool } from "../src/tools/mock/get-customer.js";
import { getOrderTool } from "../src/tools/mock/get-order.js";
import { getOrdersTool } from "../src/tools/mock/get-orders.js";
import { getShipmentTool } from "../src/tools/mock/get-shipment.js";
import { toPiTool } from "../src/runtime/pi-adapter/pi-tool-adapter.js";

const context = {
  conversationId: "conversation_1",
  agentId: "customer-service",
};

describe("mock business tools", () => {
  it("returns deterministic customer, order and shipment data", async () => {
    const customer = await getCustomerTool.execute(
      { customerId: "customer_001" },
      context,
    );
    const orders = await getOrdersTool.execute(
      { customerId: "customer_001" },
      context,
    );
    const order = await getOrderTool.execute({ orderId: "order_001" }, context);
    const shipment = await getShipmentTool.execute(
      { orderId: "order_001" },
      context,
    );

    expect(customer).toMatchObject({ ok: true, data: { name: "张三" } });
    expect(getCustomerTool).toMatchObject({
      version: "1.0.0",
      permissions: ["customer:read"],
    });
    expect(orders.ok && orders.data.orders[0]?.id).toBe("order_001");
    expect(order).toMatchObject({ ok: true, data: { status: "shipped" } });
    expect(shipment).toMatchObject({ ok: true, data: { carrier: "顺丰速运" } });
  });

  it("normalizes not-found failures", async () => {
    await expect(
      getOrderTool.execute({ orderId: "missing" }, context),
    ).resolves.toEqual({
      ok: false,
      error: { code: "ORDER_NOT_FOUND", message: "订单不存在" },
    });
  });
});

describe("Pi tool adapter", () => {
  it("converts schema and normalized result at the runtime boundary", async () => {
    const tool = toPiTool(getCustomerTool, context);
    const result = await tool.execute("call_1", { customerId: "customer_001" });

    expect(tool.parameters).toMatchObject({
      type: "object",
      required: ["customerId"],
    });
    expect(result.details).toMatchObject({
      ok: true,
      data: { id: "customer_001" },
    });
  });
});
