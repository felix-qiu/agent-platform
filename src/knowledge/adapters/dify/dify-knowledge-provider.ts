import { AppError } from "../../../shared/errors.js";
import type {
  KnowledgeProvider,
  KnowledgeResult,
  KnowledgeSearchContext,
} from "../../knowledge-provider.js";

export class DifyKnowledgeProvider implements KnowledgeProvider {
  readonly id = "dify";

  async search(
    query: string,
    context?: KnowledgeSearchContext,
  ): Promise<KnowledgeResult[]> {
    void query;
    void context;
    // TODO(M2+): map the Dify API response into KnowledgeResult.
    throw new AppError(
      "KNOWLEDGE_ADAPTER_NOT_CONFIGURED",
      "Dify adapter is not configured",
    );
  }
}
