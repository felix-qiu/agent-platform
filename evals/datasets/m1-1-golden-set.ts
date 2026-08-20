import type { EvaluationCase } from "../cases/evaluation-case.js";

export const m11GoldenSet: readonly EvaluationCase[] = [
  {
    id: "knowledge-policy-question",
    category: "knowledge",
    input: ["请问退换货政策是什么？"],
    expectedTools: [],
    expectedOutcome: "completed",
  },
  {
    id: "order-shipment-query",
    category: "order",
    input: ["我的订单发货了吗？"],
    expectedTools: ["get_orders", "get_order", "get_shipment"],
    expectedOutcome: "completed",
  },
  {
    id: "multi-turn-order-context",
    category: "multi_turn",
    input: ["我想看一下最近的订单。", "这个订单的物流到哪里了？"],
    expectedTools: ["get_orders", "get_order", "get_shipment"],
    expectedOutcome: "completed",
  },
  {
    id: "orders-tool-failure",
    category: "tool_failure",
    input: ["我的订单发货了吗？"],
    expectedTools: ["get_orders"],
    expectedOutcome: "failed",
    setup: { failTool: "get_orders" },
  },
  {
    id: "explicit-human-request",
    category: "human_request",
    input: ["请帮我转人工客服。"],
    expectedTools: [],
    expectedOutcome: "completed",
  },
];
