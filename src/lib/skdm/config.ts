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
};

/** Coordinate size of 1 key unit (column index spacing). */
export const KEY_UNIT = 1.0;

/** Vertical spacing between rows. */
export const ROW_HEIGHT_U = 1.0;

/** Physical center-to-center key pitch (mm) for U → mm conversion. Standard MX spacing. */
export const KEY_PITCH_MM = 19.05;

/**
 * Max center-to-center distance (layout U) for a typo to count as physically adjacent
 * (orthogonal + diagonal neighbors on the staggered grid).
 */
export const SPATIAL_ADJACENT_MAX_DISTANCE_U = Math.SQRT2;

// --- Outlier filtering ---
export const OUTLIER_HARD_CUTOFF_MS = 2000.0;
export const OUTLIER_IQR_MIN_UPPER_BOUND_MS = 500.0;
export const OUTLIER_BLEND_START_EVENTS = 50;
export const OUTLIER_BLEND_END_EVENTS = 1500;
export const OUTLIER_IQR_MULTIPLIER = 2.5;

/** Minimum observed frequency for a pair (kept at 1 = keep all). */
export const MIN_FREQUENCY = 1;

/** Exponent applied to frequency when used as a weight: weight = freq ** POWER. */
export const FREQUENCY_WEIGHT_POWER = 1.0;

// --- Mesh / confidence propagation (Graph Laplacian) ---
export const LAPLACIAN_SMOOTHING_ALPHA = 0.2;
export const LAPLACIAN_ITERATIONS = 2;

/** Row indices excluded from analysis (number row produces no typing input). */
export const EXCLUDE_ROWS: ReadonlySet<number> = new Set([0]);
