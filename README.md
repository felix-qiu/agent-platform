# agent-platform

`agent-platform` 是企业业务 Agent 的运行平台。本仓库当前完成第一阶段 **M1 Runtime Skeleton**：以 Customer Service Agent 为首个业务 Agent，通过平台自有 Runtime 契约隔离 Pi，并跑通 Conversation、Mock Tool Calling、LLM Loop、Streaming 与 HTTP API。

## M1 范围

- TypeScript strict + Node.js 单服务
- Customer Service Agent Definition 与安全 Prompt
- 平台自有 `AgentRuntime` / `RuntimeEvent` 契约
- `@earendil-works/pi-agent-core` + `@earendil-works/pi-ai` 适配器
- Conversation 模型、Repository 抽象及内存实现
- `get_customer`、`get_orders`、`get_order`、`get_shipment` 确定性 Mock Tools
- Tool Call 事件、文本增量与 SSE
- 结构化日志、统一错误、单元测试和无真实 LLM 的端到端测试

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
Mock Business Tools
```

业务模块只依赖 `AgentRuntime` 和平台自有事件。只有 `src/runtime/pi-adapter` 可以导入 Pi 包；替换 Runtime 时，Agent、Tool、Conversation 和 API 无需跟随 Pi 类型重写。

## 目录

```text
src/
├── agents/             Agent Definition 与 Customer Service Prompt
├── api/                Fastify 服务、路由和 SSE 输出
├── config/             环境变量校验
├── conversations/      Conversation 模型、Repository 与 Service
├── observability/      脱敏结构化日志
├── runtime/            平台 Runtime 契约、FakeRuntime、Pi Adapter
├── shared/             统一错误
└── tools/              Tool 契约与确定性 Mock Tools
tests/                  单元、HTTP、SSE 与 Tool Loop 测试
```

## 环境要求

- Node.js `>= 22.19.0`（当前 Pi `0.84.2` 的最低要求）
- npm（随 Node.js 提供）
- 任一 Pi 支持的模型 Provider API Key（仅真实模型运行需要）

## 安装与配置

```bash
npm ci
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
npm run dev
```

生产构建与启动：

```bash
npm run build
npm start
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

公开事件包括 `run.started`、`message.delta`、`message.completed`、`tool.started`、`tool.completed`、`tool.failed`、`run.completed` 和 `run.failed`。API 不发送 Prompt、隐藏推理、认证信息或完整敏感 Tool 参数。

## 质量检查与 GitHub 提交规范

任何准备 push 到 GitHub 或提交 Pull Request 的代码，都必须先在本地执行：

```bash
npm run check
```

`check` 与 GitHub Actions 的 `quality` job 使用完全相同的质量门槛，并按顺序执行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

其中任意一步失败都必须修复根因后再提交，不应跳过测试、降低 TypeScript strict、禁用 lint 规则或使用 `continue-on-error`。CI 由 push 和 Pull Request 触发；`quality` 应配置为 GitHub Branch Protection 的 Required Status Check。

需要自动格式化文件时单独运行：

```bash
npm run format
```

测试使用 `FakeRuntime`，不访问真实 LLM。端到端用例会依次调用 `get_orders`、`get_order` 和 `get_shipment`，校验 SSE 事件及最终 Conversation 消息持久化。

## Mock Tools

| Tool           | 语义             | 主要确定性数据               |
| -------------- | ---------------- | ---------------------------- |
| `get_customer` | 查询客户         | `customer_001` / 张三        |
| `get_orders`   | 查询客户订单列表 | `order_001`、`order_002`     |
| `get_order`    | 查询单个订单     | `order_001.status = shipped` |
| `get_shipment` | 查询物流         | 顺丰、运输中、最新节点       |

Tool 通过统一 `BusinessTool` 接口注入，不能访问任意 Shell、文件系统、数据库或 HTTP。M2 可在相同接口后替换为沙箱/真实业务实现。

## M1 明确未实现

本阶段不包含 Knowledge/RAG、真实客户/订单/物流接口、Ticket、完整 Human Handoff、数据库持久化、Redis、向量数据库、管理后台、Web 前端、登录系统、Multi-Agent、Router、Supervisor、Workflow Engine、微服务或复杂部署。

## Known Limitations

- Conversation 使用进程内 Map，重启后数据丢失，也不适合多实例部署。
- M1 不做同一 Conversation 的并发消息串行化和断线续传。
- Pi 模型目录由安装版本提供；配置不存在的 provider/model 会以 `run.failed` 结束。
- 真实模型的 Tool 选择质量依赖所选模型和 Provider；CI 只验证确定性的 FakeRuntime 主链路。

## M2 建议

M2 Grounded Support 应保持现有边界，增加 Knowledge 接口、`search_knowledge`、身份/租户上下文，以及客户、订单、物流的沙箱或真实 Adapter；同时覆盖 PRD 的订单澄清、物流异常、Tool 超时和事实 grounding 场景，不在此之前引入 Multi-Agent。
