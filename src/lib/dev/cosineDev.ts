export interface CosineSearchResult {
  id: string;
  subject: string | null;
  content: string;
  language: string;
  source: string;
  similarity: number;
}

export interface CosineSearchResponse {
  querySubject: string;
  totalWithEmbedding: number;
  results: CosineSearchResult[];
}

export function formatSimilarity(value: number): string {
  return value.toFixed(4);
}
