/**
 * SKDM global configuration. Port of `skdm/config.py`.
 * All numeric constants used by the model live here.
 */

/** Standard keyboard row stagger (in key units), cumulative per row. */
export const ROW_STAGGER_U: Record<number, number> = {
  0: 0.0, // number row
  1: 0.5, // qwerty
  2: 0.75, // asdf
  3: 1.25, // zxcv
  4: 2.0, // space
};

/** Coordinate size of 1 key unit (column index spacing). */
export const KEY_UNIT = 1.0;

/** Vertical spacing between rows. */
export const ROW_HEIGHT_U = 1.0;

// --- Outlier filtering ---
export const OUTLIER_STATIC_MAX_MS = 1500.0;
export const OUTLIER_IQR_MIN_EVENTS = 200;
export const OUTLIER_IQR_MULTIPLIER = 1.5;

/** Minimum observed frequency for a pair (kept at 1 = keep all). */
export const MIN_FREQUENCY = 1;

/** Exponent applied to frequency when used as a weight: weight = freq ** POWER. */
export const FREQUENCY_WEIGHT_POWER = 1.0;

// --- Mesh / confidence propagation (Graph Laplacian) ---
export const LAPLACIAN_SMOOTHING_ALPHA = 0.2;
export const LAPLACIAN_ITERATIONS = 2;

/** Row indices excluded from analysis (number row produces no typing input). */
export const EXCLUDE_ROWS: ReadonlySet<number> = new Set([0]);
