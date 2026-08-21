import { AppError } from "../../../shared/errors.js";
import type {
  KnowledgeProvider,
  KnowledgeResult,
  KnowledgeSearchContext,
} from "../../knowledge-provider.js";

export class OpenWebUIKnowledgeProvider implements KnowledgeProvider {
  readonly id = "open-webui";

  async search(
    query: string,
    context?: KnowledgeSearchContext,
  ): Promise<KnowledgeResult[]> {
    void query;
    void context;
    // TODO(M2+): map the Open WebUI API response into KnowledgeResult.
    throw new AppError(
      "KNOWLEDGE_ADAPTER_NOT_CONFIGURED",
      "Open WebUI adapter is not configured",
    );
  }
}
