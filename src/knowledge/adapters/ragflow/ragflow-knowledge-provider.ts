import { AppError } from "../../../shared/errors.js";
import type {
  KnowledgeProvider,
  KnowledgeResult,
  KnowledgeSearchContext,
} from "../../knowledge-provider.js";

export class RagflowKnowledgeProvider implements KnowledgeProvider {
  readonly id = "ragflow";

  async search(
    query: string,
    context?: KnowledgeSearchContext,
  ): Promise<KnowledgeResult[]> {
    void query;
    void context;
    // TODO(M2+): map the RAGFlow API response into KnowledgeResult.
    throw new AppError(
      "KNOWLEDGE_ADAPTER_NOT_CONFIGURED",
      "RAGFlow adapter is not configured",
    );
  }
}
