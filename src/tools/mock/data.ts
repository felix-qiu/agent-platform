export const mockCustomer = {
  id: "customer_001",
  name: "张三",
  tier: "standard",
} as const;

export const mockOrders = [
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
] as const;

export const mockShipment = {
  orderId: "order_001",
  carrier: "顺丰速运",
  trackingNumber: "SF1234567890",
  status: "in_transit",
  latestEvent: "包裹已离开上海转运中心",
} as const;
