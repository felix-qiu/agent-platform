export interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly status: string;
  readonly item: string;
}

export interface Shipment {
  readonly orderId: string;
  readonly carrier: string;
  readonly trackingNumber: string;
  readonly status: string;
  readonly latestEvent: string;
}

export interface OrderProvider {
  getOrders(customerId: string): Promise<readonly Order[] | undefined>;
  getOrder(orderId: string): Promise<Order | undefined>;
  getShipment(orderId: string): Promise<Shipment | undefined>;
}
