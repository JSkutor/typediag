/** Response shape from GET /api/dev/cost-stats */
export interface DbCostStats {
  total: number;
  embedded: number;
  topicSource: number;
  batchSource: number;
  distinctTopics: number;
  similarityThreshold: number;
  batchMetadata: { request_count?: number; job_id?: string; submitted_at?: string } | null;
  disk?: {
    databaseGb: number;
    databaseBytes?: number;
    sessionDataGb: number;
  };
  usage?: {
    pageCount: number;
    keyEventCount?: number;
    runCount?: number;
    pagesLast30d: number;
    kbPerPageEstimate: number | null;
    growthGbPer30d: number | null;
  };
  glossary?: Record<string, string>;
  error?: string;
}
