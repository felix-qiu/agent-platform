import type { Order, OrderProvider, Shipment } from "../../order-provider.js";

const sandboxOrders: readonly Order[] = [
  {
    id: "order_001",
    customerId: "customer_001",
    status: "shipped",
    item: "无线耳机",
  },
  {
    id: "order_002",
    customerId: "customer_001",
    status: "processing",
    item: "机械键盘",
  },
];

const sandboxShipment: Shipment = {
  orderId: "order_001",
  carrier: "顺丰速运",
  trackingNumber: "SF1234567890",
  status: "in_transit",
  latestEvent: "包裹已离开上海转运中心",
};

export class SandboxOrderProvider implements OrderProvider {
  async getOrders(customerId: string): Promise<readonly Order[] | undefined> {
    if (!sandboxOrders.some((order) => order.customerId === customerId))
      return undefined;
    return structuredClone(
      sandboxOrders.filter((order) => order.customerId === customerId),
    );
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    const order = sandboxOrders.find(({ id }) => id === orderId);
    return order === undefined ? undefined : structuredClone(order);
  }

  async getShipment(orderId: string): Promise<Shipment | undefined> {
    return orderId === sandboxShipment.orderId
      ? structuredClone(sandboxShipment)
      : undefined;
  }
}

export const sandboxOrderProvider = new SandboxOrderProvider();
