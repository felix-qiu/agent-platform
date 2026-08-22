import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.url().optional(),
);

const envSchema = z
  .object({
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z.string().default("info"),
    LLM_PROVIDER: z.string().default("openai"),
    LLM_MODEL: z.string().default("gpt-4o-mini"),
    LLM_API_KEY: optionalString,
    KNOWLEDGE_PROVIDER: z
      .enum(["mock", "ragflow", "open-webui", "dify"])
      .default("mock"),
    RAGFLOW_BASE_URL: optionalUrl,
    RAGFLOW_API_KEY: optionalString,
    RAGFLOW_DATASET_IDS: optionalString,
    RAGFLOW_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  })
  .superRefine((config, context) => {
    if (config.KNOWLEDGE_PROVIDER !== "ragflow") return;
    for (const key of [
      "RAGFLOW_BASE_URL",
      "RAGFLOW_API_KEY",
      "RAGFLOW_DATASET_IDS",
    ] as const) {
      if (config[key] === undefined) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when KNOWLEDGE_PROVIDER=ragflow`,
        });
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return envSchema.parse(environment);
}
