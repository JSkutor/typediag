/**
 * SKDM core data types. Direct TypeScript port of the dataclasses in
 * `skdm/model.py` and `skdm/layout.py`.
 */

/** A single keystroke event: `fromKey` was pressed, then `selfKey` after `latencyMs`. */
export interface KeyEvent {
  fromKey: string;
  selfKey: string;
  latencyMs: number;
}

/** Aggregated statistics for one `(from, self)` key pair. */
export interface PairStat {
  fromKey: string;
  selfKey: string;
  /** Observation count for this pair (after outlier removal). */
  frequency: number;
  /** Mean post-sigmoid value in [0, 1]; larger = slower. */
  z: number;
}

/** Physical coordinate info for a single key. */
export interface KeyPosition {
  key: string;
  row: number;
  col: number;
  x: number;
  y: number;
}

/** Final per-key result. Corresponds to one 3D point. */
export interface KeyResult {
  key: string;
  row: number;
  x: number;
  y: number;
  /** Compressed representative latency (sigmoid scale, pre-smoothing). */
  z: number;
  /** Total incoming frequency = confidence. */
  confidence: number;
  /** Latency standard deviation (raw ms scale). */
  stdev: number;
  /** z after Laplacian smoothing. */
  zSmoothed: number;
  /** stdev after Laplacian smoothing. */
  stdevSmoothed: number;
}
