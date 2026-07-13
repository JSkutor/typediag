import { describe, it, expect } from "vitest";
import { encodeGlobalSurface, decodeGlobalSurface } from "./shareEncoder";
import { buildLayout, KeyResult } from "@/lib/skdm";
import { EXCLUDE_ROWS } from "@/lib/skdm/config";

describe("shareEncoder", () => {
  const layout = buildLayout();

  it("should correctly encode and decode key stats", () => {
    const mockStats: Record<string, KeyResult> = {};
    
    // Pick a valid key from the layout
    const validKey = Object.keys(layout).find(k => !EXCLUDE_ROWS.has(layout[k].row));
    if (!validKey) throw new Error("No valid keys found in layout");

    const pos = layout[validKey];
    
    mockStats[validKey] = {
      key: validKey,
      row: pos.row,
      x: pos.x,
      y: pos.y,
      z: 10,
      confidence: 85.6, // should be rounded to 86
      stdev: 0,
      zSmoothed: 12.34567, // should be rounded to 12.3457
      stdevSmoothed: 0,
    };

    const encoded = encodeGlobalSurface(mockStats);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeGlobalSurface(encoded);
    
    // It should reconstruct the sent key
    const decodedKey = decoded[validKey];
    expect(decodedKey).toBeDefined();
    expect(decodedKey.zSmoothed).toBeCloseTo(12.3457, 4);
    expect(decodedKey.confidence).toBe(86);

    // Other keys should be initialized to 0
    const otherKey = Object.keys(layout).find(k => !EXCLUDE_ROWS.has(layout[k].row) && k !== validKey);
    if (otherKey) {
      expect(decoded[otherKey]).toBeDefined();
      expect(decoded[otherKey].zSmoothed).toBe(0);
      expect(decoded[otherKey].confidence).toBe(0);
    }
  });

  it("should cleanly handle values with trailing zeros in toFixed", () => {
    const mockStats: Record<string, KeyResult> = {};
    const validKey = Object.keys(layout).find(k => !EXCLUDE_ROWS.has(layout[k].row))!;
    const pos = layout[validKey];

    mockStats[validKey] = {
      key: validKey,
      row: pos.row,
      x: pos.x,
      y: pos.y,
      z: 0,
      confidence: 100,
      stdev: 0,
      zSmoothed: 15.0000, // exact integer
      stdevSmoothed: 0,
    };

    const encoded = encodeGlobalSurface(mockStats);
    const decoded = decodeGlobalSurface(encoded);
    
    expect(decoded[validKey].zSmoothed).toBe(15);
    expect(decoded[validKey].confidence).toBe(100);
  });

  it("should handle empty object gracefully", () => {
    const encoded = encodeGlobalSurface({});
    expect(typeof encoded).toBe("string");
    
    const decoded = decodeGlobalSurface(encoded);
    // Even if empty, decoder populates all valid layout keys with 0s
    const validKeyCount = Object.values(layout).filter(pos => !EXCLUDE_ROWS.has(pos.row)).length;
    expect(Object.keys(decoded).length).toBe(validKeyCount);
  });

  it("should handle invalid or corrupted strings without throwing", () => {
    // arbitrary invalid base64 / decoded string
    const decoded = decodeGlobalSurface("some_invalid_encoded_string_!@#");
    const validKey = Object.keys(layout).find(k => !EXCLUDE_ROWS.has(layout[k].row))!;
    
    // It should still return a full layout populated with 0s
    expect(decoded[validKey]).toBeDefined();
    expect(decoded[validKey].zSmoothed).toBe(0);
    expect(decoded[validKey].confidence).toBe(0);
  });
});
