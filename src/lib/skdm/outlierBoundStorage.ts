import { safeParseStorage, safeSetStorage } from "@/utils/storage";

const STORAGE_KEY = "typediag_skdm_final_upper_bound_v1";

/** Persisted SKDM outlier upper bound snapshot (snake_case for storage). */
export interface SkdmFinalUpperBoundRecord {
  final_upper_bound_ms: number;
  max_clip_ms: number;
  source_event_count: number;
  updated_at: string;
}

export function readSkdmFinalUpperBound(): SkdmFinalUpperBoundRecord | null {
  return safeParseStorage<SkdmFinalUpperBoundRecord | null>(STORAGE_KEY, null);
}

export function persistSkdmFinalUpperBound(record: SkdmFinalUpperBoundRecord): void {
  safeSetStorage(STORAGE_KEY, record);
}
