import { createApp } from "./api/server.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./observability/logger.js";

const config = loadConfig();
const app = await createApp({
  ...(config.LLM_API_KEY === undefined
    ? {}
    : { llmApiKey: config.LLM_API_KEY }),
});

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

try {
  await app.listen({ host: config.HOST, port: config.PORT });
  logger.info(
    { host: config.HOST, port: config.PORT },
    "agent-platform started",
  );
} catch (error) {
  logger.fatal({ error }, "failed to start agent-platform");
  process.exit(1);
}
