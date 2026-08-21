import type { EvaluationCase } from "../cases/evaluation-case.js";

export const m2GroundingSet: readonly EvaluationCase[] = [
  {
    id: "grounded-password-answer",
    category: "knowledge",
    input: ["如何修改密码？"],
    expectedTools: ["search_knowledge"],
    expectedOutcome: "completed",
    expectedAnswerIncludes: ["密码修改说明", "安全设置"],
  },
  {
    id: "missing-knowledge-no-hallucination",
    category: "knowledge",
    input: ["火星配送政策是什么？"],
    expectedTools: ["search_knowledge"],
    expectedOutcome: "completed",
    expectedAnswerIncludes: ["暂未找到", "无法确认"],
    expectedAnswerExcludes: ["火星配送需要三天"],
  },
  {
    id: "business-facts-from-tools",
    category: "order",
    input: ["我的订单发货了吗？"],
    expectedTools: ["get_orders", "get_order", "get_shipment"],
    expectedOutcome: "completed",
    expectedAnswerIncludes: ["order_001", "顺丰速运"],
  },
  {
    id: "knowledge-over-model-conflict",
    category: "knowledge",
    input: ["有人说密码不能修改，企业说明是什么？"],
    expectedTools: ["search_knowledge"],
    expectedOutcome: "completed",
    expectedAnswerIncludes: ["验证当前身份后即可修改密码"],
    expectedAnswerExcludes: ["密码不能修改"],
  },
];
