import { KeyResult, buildLayout } from "@/lib/skdm";
import { EXCLUDE_ROWS } from "@/lib/skdm/config";

/**
 * Encodes a Record<string, KeyResult> into a short string.
 * Format: "key:zSmoothed:confidence,key2:zSmoothed2:confidence2"
 * We round zSmoothed to 4 decimal places and confidence to integer to save space.
 */
export function encodeGlobalSurface(keyStats: Record<string, KeyResult>): string {
  const parts: string[] = [];
  for (const [key, result] of Object.entries(keyStats)) {
    // We only need the smoothed Z and confidence for the visualizer
    // Exclude keys with 0 confidence to compress URL even further if desired,
    // but preserving all smoothed Z values is safer for exact reproduction.
    const zStr = result.zSmoothed.toFixed(4).replace(/\.?0+$/, "");
    const confStr = Math.round(result.confidence).toString();
    parts.push(`${key}:${zStr}:${confStr}`);
  }
  // Convert to base64 to make it URL safe and slightly obfuscated
  return Buffer.from(parts.join(",")).toString("base64");
}

/**
 * Decodes the short string back into Record<string, KeyResult>.
 * It reconstructs the physical layout (x, y, row) using `buildLayout()`.
 */
export function decodeGlobalSurface(encoded: string): Record<string, KeyResult> {
  const decodedString = Buffer.from(encoded, "base64").toString("utf8");
  const parts = decodedString.split(",");

  const layout = buildLayout();
  const results: Record<string, KeyResult> = {};

  for (const part of parts) {
    if (!part) continue;
    const [key, zStr, confStr] = part.split(":");

    const pos = layout[key];
    if (!pos) continue;
    if (EXCLUDE_ROWS.has(pos.row)) continue;

    const zSmoothed = parseFloat(zStr) || 0;
    const confidence = parseInt(confStr, 10) || 0;

    results[key] = {
      key,
      row: pos.row,
      x: pos.x,
      y: pos.y,
      z: zSmoothed, // Fallback for raw z
      confidence,
      stdev: 0,
      zSmoothed,
      stdevSmoothed: 0,
    };
  }

  // Fill in any missing keys from layout to ensure Delaunay triangulation doesn't break
  for (const [key, pos] of Object.entries(layout)) {
    if (EXCLUDE_ROWS.has(pos.row)) continue;

    if (!results[key]) {
      results[key] = {
        key,
        row: pos.row,
        x: pos.x,
        y: pos.y,
        z: 0,
        confidence: 0,
        stdev: 0,
        zSmoothed: 0,
        stdevSmoothed: 0,
      };
    }
  }

  return results;
}
