import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ConversationService } from "../../conversations/conversation-service.js";
import { logger } from "../../observability/logger.js";

const paramsSchema = z.object({ conversationId: z.string().uuid() });
const messageSchema = z.object({
  message: z.string().trim().min(1).max(10_000),
});

export async function registerConversationRoutes(
  app: FastifyInstance,
  service: ConversationService,
): Promise<void> {
  app.post("/v1/conversations", async (_request, reply) => {
    const conversation = await service.createConversation();
    return reply
      .code(201)
      .send({ id: conversation.id, status: conversation.status });
  });

  app.post(
    "/v1/conversations/:conversationId/messages",
    async (request, reply) => {
      const { conversationId } = paramsSchema.parse(request.params);
      const { message } = messageSchema.parse(request.body);

      reply.hijack();
      reply.raw.statusCode = 200;
      reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      try {
        for await (const event of service.sendMessage(
          conversationId,
          message,
        )) {
          if (event.type !== "message.delta") {
            logger.info(
              {
                conversationId,
                agentId: event.agentId,
                event: event.type,
                ...("toolName" in event ? { toolName: event.toolName } : {}),
                ...("durationMs" in event
                  ? { duration: event.durationMs }
                  : {}),
                ...("error" in event ? { error: event.error } : {}),
              },
              "runtime event",
            );
          }
          reply.raw.write(`event: ${event.type}\n`);
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } finally {
        reply.raw.end();
      }
    },
  );
}
