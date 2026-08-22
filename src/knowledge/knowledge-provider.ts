export type KnowledgeMetadataValue = string | number | boolean;

export interface KnowledgeSearchContext {
  readonly limit?: number;
  readonly category?: string;
  readonly signal?: AbortSignal;
}

export interface KnowledgeResult {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly score: number;
  readonly metadata: Readonly<Record<string, KnowledgeMetadataValue>>;
  readonly updatedAt: string;
}

export interface KnowledgeProvider {
  readonly id: string;
  search(
    query: string,
    context?: KnowledgeSearchContext,
  ): Promise<KnowledgeResult[]>;
}
