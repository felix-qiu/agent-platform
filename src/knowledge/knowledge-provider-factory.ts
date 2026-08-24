import { AppError } from "../shared/errors.js";
import { RagflowKnowledgeProvider } from "./adapters/ragflow/ragflow-knowledge-provider.js";
import type { KnowledgeProvider } from "./knowledge-provider.js";
import { MockKnowledgeProvider } from "./mock/mock-knowledge-provider.js";

export type KnowledgeProviderConfig =
  | { readonly provider: "mock" }
  | { readonly provider: "open-webui" }
  | { readonly provider: "dify" }
  | {
      readonly provider: "ragflow";
      readonly baseUrl: string;
      readonly apiKey: string;
      readonly datasetIds: readonly string[];
      readonly timeoutMs?: number;
    };

export interface KnowledgeProviderEnvironment {
  readonly KNOWLEDGE_PROVIDER: "mock" | "ragflow" | "open-webui" | "dify";
  readonly RAGFLOW_BASE_URL?: string | undefined;
  readonly RAGFLOW_API_KEY?: string | undefined;
  readonly RAGFLOW_DATASET_IDS?: string | undefined;
  readonly RAGFLOW_TIMEOUT_MS: number;
}

export function createKnowledgeProvider(
  config: KnowledgeProviderConfig,
): KnowledgeProvider {
  switch (config.provider) {
    case "mock":
      return new MockKnowledgeProvider();
    case "ragflow":
      return new RagflowKnowledgeProvider(config);
    case "open-webui":
      throw adapterNotConfigured("Open WebUI");
    case "dify":
      throw adapterNotConfigured("Dify");
  }
}

export function knowledgeProviderConfigFromEnvironment(
  environment: KnowledgeProviderEnvironment,
): KnowledgeProviderConfig {
  if (environment.KNOWLEDGE_PROVIDER !== "ragflow") {
    return { provider: environment.KNOWLEDGE_PROVIDER };
  }
  const baseUrl = requireRagflowValue(
    "RAGFLOW_BASE_URL",
    environment.RAGFLOW_BASE_URL,
  );
  const apiKey = requireRagflowValue(
    "RAGFLOW_API_KEY",
    environment.RAGFLOW_API_KEY,
  );
  const datasetIds = requireRagflowValue(
    "RAGFLOW_DATASET_IDS",
    environment.RAGFLOW_DATASET_IDS,
  )
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  return {
    provider: "ragflow",
    baseUrl,
    apiKey,
    datasetIds,
    timeoutMs: environment.RAGFLOW_TIMEOUT_MS,
  };
}

function adapterNotConfigured(name: string): AppError {
  return new AppError(
    "KNOWLEDGE_ADAPTER_NOT_CONFIGURED",
    `${name} knowledge adapter is not configured`,
  );
}

function requireRagflowValue(name: string, value: string | undefined): string {
  if (value !== undefined && value.trim() !== "") return value;
  throw new AppError(
    "KNOWLEDGE_PROVIDER_CONFIG_INVALID",
    `${name} is required when KNOWLEDGE_PROVIDER=ragflow`,
  );
}
