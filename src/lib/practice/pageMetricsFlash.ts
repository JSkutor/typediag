export const PAGE_METRICS_FLASH_DURATION_MS = 2200;

export interface PageMetricsFlash {
  cpm: number;
  wpm: number;
  accuracy: number;
}

export interface FinishPageResult {
  runId: string;
  cpm: number;
  wpm: number;
  accuracy: number;
}

export function formatPageMetricsFlashCpm(cpm: number): string {
  return `${cpm} CPM`;
}
