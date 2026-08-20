import { getCustomerTool } from "./get-customer.js";
import { getOrderTool } from "./get-order.js";
import { getOrdersTool } from "./get-orders.js";
import { getShipmentTool } from "./get-shipment.js";

export const mockBusinessTools = [
  getCustomerTool,
  getOrdersTool,
  getOrderTool,
  getShipmentTool,
];
