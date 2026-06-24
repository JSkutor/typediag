import { KeyResult, KeyEvent } from "./types";
import { PRECOMPUTED_KEY_STATS, PRECOMPUTED_CYLINDRICAL_EVENTS } from "./precomputedLandingData";

/**
 * Returns precomputed actual KeyResult data for the LatencySurface3D on the landing page.
 * Sourced from the user's restored local_db.json.
 */
export function getMockKeyStats(): Record<string, KeyResult> {
  return PRECOMPUTED_KEY_STATS;
}

/**
 * Returns precomputed actual KeyEvents for the CylindricalVector3D on the landing page.
 * Sourced from the user's restored local_db.json.
 */
export function getMockCylindricalEvents(): KeyEvent[] {
  return PRECOMPUTED_CYLINDRICAL_EVENTS;
}
