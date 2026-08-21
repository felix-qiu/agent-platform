# agent-platform

`agent-platform` 是企业业务 Agent 的运行平台。本仓库当前完成 **M2 Grounded Support**：Customer Service Agent 通过 Knowledge Tool 和 Sandbox Business Provider，以企业知识和业务数据作为回答事实来源。

## M1 范围

- TypeScript strict + Node.js 单服务
- Customer Service Agent Definition 与安全 Prompt
- 平台自有 `AgentRuntime` / `RuntimeEvent` 契约
- `@earendil-works/pi-agent-core` + `@earendil-works/pi-ai` 适配器
- Conversation 模型、Repository 抽象及内存实现
- `get_customer`、`get_orders`、`get_order`、`get_shipment` 确定性 Mock Tools
- Tool Call 事件、文本增量与 SSE
- 结构化日志、统一错误、单元测试和无真实 LLM 的端到端测试

## M1.1 Hardening

- **Runtime Contract Test**：同一套行为契约覆盖 `FakeRuntime` 与 `PiRuntimeAdapter`；Pi 使用内存 faux provider，不访问真实 LLM。
- **Agent Version**：`AgentDefinition` 包含 `version`、`permissions`、`policies`，Conversation 固化 `agentId` 与 `agentVersion`。
- **Tool Version**：Tool 包含 `version` 与 `permissions`，公开 Tool Event 携带 `toolVersion`。
- **Trace Model**：每次 run 生成唯一 `traceId`，内存 Trace 保存 Conversation、Agent Version 与完整 RuntimeEvent 序列。
- **Evaluation Skeleton**：最小 Golden Set 覆盖知识问答、订单查询、多轮上下文、Tool 失败和人工请求，由 `FakeRuntime` 确定性执行。

## M2 Grounded Support

- **Knowledge Provider**：统一 `search(query, context?)` 契约，结果包含来源、相关度、元数据与更新时间。
- **search_knowledge Tool**：Agent 只能通过业务 Tool 检索知识，不能直接依赖 Knowledge Provider。
- **Mock Knowledge Provider**：提供密码和账号修改的确定性企业知识，用于无真实 LLM 的 Grounding 测试。
- **Business Adapter Layer**：客户、订单和物流 Tool 改为依赖 Provider Interface，默认使用 Sandbox Provider。
- **Knowledge Trace**：`knowledge.search.started/completed` 记录 provider、source、score 和 Trace 关联。
- **Grounding Evaluation**：验证必须检索、无知识不编造、订单事实来自 Tool、知识与模型冲突时 Knowledge 优先。

预留的 Adapter 边界支持未来接入 RAGFlow、Open WebUI、Dify 或自建知识库；当前占位 Adapter 不包含第三方 SDK、网络调用或数据库依赖。

## 架构

```text
HTTP API
   ↓
Conversation Service
   ↓
Customer Service Agent
   ↓
Agent Runtime Interface
   ↓
Pi Runtime Adapter
   ↓
Pi Agent / LLM
   ↓
[search_knowledge Tool | Business Tools]
   ↓                         ↓
Knowledge Provider       Business Provider
   ↓                         ↓
Mock Knowledge          Sandbox Customer/Order
```

业务模块只依赖 `AgentRuntime` 和平台自有事件。只有 `src/runtime/pi-adapter` 可以导入 Pi 包；替换 Runtime 时，Agent、Tool、Conversation 和 API 无需跟随 Pi 类型重写。

## 目录

```text
src/
├── agents/             Agent Definition 与 Customer Service Prompt
├── api/                Fastify 服务、路由和 SSE 输出
├── business/           Customer/Order Provider 与 Sandbox Adapter
├── config/             环境变量校验
├── conversations/      Conversation 模型、Repository 与 Service
├── knowledge/          KnowledgeProvider、Mock 与第三方 Adapter 边界
├── observability/      脱敏结构化日志与内存 Trace
├── runtime/            平台 Runtime 契约、FakeRuntime、Pi Adapter
├── shared/             统一错误
└── tools/              Tool 契约与确定性 Mock Tools
evals/                  Golden Set、Evaluation Case 与 Runner
tests/                  单元、Runtime Contract、HTTP、SSE 与 Evaluation 测试
```

## 环境要求

- Node.js `>= 22.19.0`（当前 Pi `0.84.2` 的最低要求）
- pnpm `11.17.0`
- 任一 Pi 支持的模型 Provider API Key（仅真实模型运行需要）

## 安装与配置

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

默认模型是 `openai/gpt-4o-mini`。可以使用 Provider 原生变量：

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=your-key
```

也可以用通用覆盖变量 `LLM_API_KEY`。例如切换 Anthropic：

```dotenv
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
LLM_API_KEY=your-key
```

不要提交 `.env` 或真实密钥。没有 API Key 时项目仍可安装、编译、启动和运行全部测试；只有调用真实 Pi 消息端点会返回 `run.failed` SSE 事件。

## 启动

开发模式：

```bash
pnpm dev
```

生产构建与启动：

```bash
pnpm build
pnpm start
```

健康检查：

```bash
curl http://localhost:3000/health
```

创建 Conversation：

```bash
curl -X POST http://localhost:3000/v1/conversations
```

返回示例：

```json
{ "id": "<conversation-id>", "status": "active" }
```

SSE Chat（替换 ID）：

```bash
curl -N \
  -H 'Content-Type: application/json' \
  -d '{"message":"我的订单发货了吗？"}' \
  http://localhost:3000/v1/conversations/<conversation-id>/messages
```

公开事件包括 `run.started`、`message.delta`、`message.completed`、`tool.*`、`knowledge.search.*`、`run.completed` 和 `run.failed`。Knowledge 完成事件只携带 provider、source、score 等依据摘要，不暴露 Prompt、隐藏推理、认证信息或敏感参数。

## 质量检查与 GitHub 提交规范

任何准备 push 到 GitHub 或提交 Pull Request 的代码，都必须先在本地执行：

```bash
pnpm check
```

`check` 与 GitHub Actions 的 `quality` job 使用完全相同的质量门槛，并按顺序执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

其中任意一步失败都必须修复根因后再提交，不应跳过测试、降低 TypeScript strict、禁用 lint 规则或使用 `continue-on-error`。CI 由 push 和 Pull Request 触发；`quality` 应配置为 GitHub Branch Protection 的 Required Status Check。

需要自动格式化文件时单独运行：

```bash
pnpm format
```

默认测试不访问真实 LLM。业务与 Evaluation 测试使用 `FakeRuntime`；Pi Runtime 契约测试使用 Pi 的内存 faux provider。端到端用例会依次调用 `get_orders`、`get_order` 和 `get_shipment`，校验 SSE、Tool Version、Trace 及最终 Conversation 消息持久化。

## Sandbox Business Tools

| Tool           | Version | 语义             | 主要确定性数据               |
| -------------- | ------- | ---------------- | ---------------------------- |
| `get_customer` | `1.0.0` | 查询客户         | `customer_001` / 张三        |
| `get_orders`   | `1.0.0` | 查询客户订单列表 | `order_001`、`order_002`     |
| `get_order`    | `1.0.0` | 查询单个订单     | `order_001.status = shipped` |
| `get_shipment` | `1.0.0` | 查询物流         | 顺丰、运输中、最新节点       |

Tool 通过统一 `BusinessTool` 接口注入，不能访问任意 Shell、文件系统、数据库或 HTTP。当前 Tool 调用 Sandbox Provider；未来真实业务系统必须通过新的 Provider Adapter 接入。

## 当前明确未实现

本阶段不包含真实知识库连接、向量数据库、真实客户/订单/物流接口、Tenant Context、Multi Tenant、RBAC、Ticket、完整 Human Handoff、管理后台、Multi-Agent、Router、Supervisor、Planner、Workflow Engine、Rust、微服务或复杂部署。

## Known Limitations

- Conversation 使用进程内 Map，重启后数据丢失，也不适合多实例部署。
- Trace 使用内存 Repository，重启后数据丢失；M1.1 不接数据库或外部 Trace Backend。
- M1 不做同一 Conversation 的并发消息串行化和断线续传。
- Pi 模型目录由安装版本提供；配置不存在的 provider/model 会以 `run.failed` 结束。
- Mock Knowledge 仅用于验证 Provider/Tool/Grounding 链路，不是正式 RAG 或企业知识库。
- 真实模型的 Tool 选择质量依赖所选模型和 Provider；CI 使用 FakeRuntime 和 Pi faux provider。

## M3 建议

M3 Human + Safety 建议在现有 Grounding 与 Trace 基础上增加 Ticket、Human Handoff、确定性高风险 Policy、Tool 超时/重试和审计查询。继续保持单 Agent，不在明确需求出现前引入 Multi-Agent 或 Workflow Engine。
