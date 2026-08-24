import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import {
  createKnowledgeProvider,
  knowledgeProviderConfigFromEnvironment,
} from "../src/knowledge/knowledge-provider-factory.js";

describe("Knowledge Provider configuration", () => {
  it("uses Mock by default", () => {
    const config = loadConfig({
      LLM_API_KEY: "",
      RAGFLOW_API_KEY: "",
    });
    const provider = createKnowledgeProvider(
      knowledgeProviderConfigFromEnvironment(config),
    );
    expect(provider.id).toBe("mock-knowledge");
  });

  it("creates RAGFlow from validated configuration", () => {
    const config = loadConfig({
      KNOWLEDGE_PROVIDER: "ragflow",
      RAGFLOW_BASE_URL: "https://ragflow.example.com",
      RAGFLOW_API_KEY: "test-key",
      RAGFLOW_DATASET_IDS: "dataset-1, dataset-2",
      RAGFLOW_TIMEOUT_MS: "2500",
    });
    const provider = createKnowledgeProvider(
      knowledgeProviderConfigFromEnvironment(config),
    );
    expect(provider.id).toBe("ragflow");
  });

  it("fails configuration validation before app startup", () => {
    expect(() => loadConfig({ KNOWLEDGE_PROVIDER: "ragflow" })).toThrow(
      /RAGFLOW_BASE_URL/,
    );
  });

  it.each(["open-webui", "dify"] as const)(
    "does not silently fall back when %s is selected",
    (provider) => {
      expect(() => createKnowledgeProvider({ provider })).toThrow(
        expect.objectContaining({ code: "KNOWLEDGE_ADAPTER_NOT_CONFIGURED" }),
      );
    },
  );
});
