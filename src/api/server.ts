import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { createCustomerServiceAgent } from "../agents/customer-service/index.js";
import { InMemoryConversationRepository } from "../conversations/in-memory-conversation-repository.js";
import { ConversationService } from "../conversations/conversation-service.js";
import type { AgentRuntime } from "../runtime/agent-runtime.js";
import { PiRuntimeAdapter } from "../runtime/pi-adapter/pi-runtime-adapter.js";
import { InMemoryTraceRepository } from "../observability/in-memory-trace-repository.js";
import { AppError, errorMessage } from "../shared/errors.js";
import { registerConversationRoutes } from "./routes/conversations.js";
import { registerHealthRoute } from "./routes/health.js";
import {
  createKnowledgeProvider,
  type KnowledgeProviderConfig,
} from "../knowledge/knowledge-provider-factory.js";
import type { AgentDefinition } from "../agents/agent-definition.js";

export interface CreateAppOptions {
  readonly runtime?: AgentRuntime;
  readonly llmApiKey?: string;
  readonly logger?: boolean;
  readonly model?: AgentDefinition["model"];
  readonly knowledgeConfig?: KnowledgeProviderConfig;
}

export async function createApp(
  options: CreateAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const knowledgeProvider = createKnowledgeProvider(
    options.knowledgeConfig ?? { provider: "mock" },
  );
  const agent = createCustomerServiceAgent(options.model, knowledgeProvider);
  const runtime =
    options.runtime ??
    new PiRuntimeAdapter(
      options.llmApiKey === undefined ? {} : { apiKey: options.llmApiKey },
    );
  const repository = new InMemoryConversationRepository();
  const traceRepository = new InMemoryTraceRepository();
  const service = new ConversationService(
    repository,
    runtime,
    agent,
    traceRepository,
  );

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request" },
      });
    }
    return reply.code(500).send({
      error: { code: "INTERNAL_ERROR", message: errorMessage(error) },
    });
  });

  await registerHealthRoute(app);
  await registerConversationRoutes(app, service);
  return app;
}
