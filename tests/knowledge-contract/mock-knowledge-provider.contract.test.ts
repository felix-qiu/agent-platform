import { MockKnowledgeProvider } from "../../src/knowledge/mock/mock-knowledge-provider.js";
import { knowledgeProviderContract } from "./knowledge-provider.contract.js";

knowledgeProviderContract(
  "MockKnowledgeProvider",
  () => new MockKnowledgeProvider(),
);
