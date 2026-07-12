interface CosineSearchResult {
  id: string;
  topic: string | null;
  content: string;
  language: string;
  source: string;
  similarity: number;
}

export interface CosineSearchResponse {
  queryTopic: string;
  totalWithEmbedding: number;
  results: CosineSearchResult[];
}

export function formatSimilarity(value: number): string {
  return value.toFixed(4);
}
