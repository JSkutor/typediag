import * as THREE from "three";
import type { KeyResult } from "@/lib/skdm";
import { CYL_COLORS } from "./geometryUtils";

export const LATENCY_POWER = 1.3;
export const TARGET_ELEVATION_SCALE = 180;

/** Latency → vertex color: 3-stage gradient (Slate Grey -> Ocean Cyan -> Neon Rose). Confidence dims low-sample keys. */
export function surfaceVertexColor(relativeZ: number, normConf: number): THREE.Color {
  const powerT = Math.pow(Math.min(1, Math.max(0, relativeZ)), 1.8);
  const lowColor = new THREE.Color(0x181a20); // Darker Slate Grey for high contrast
  const midColor = new THREE.Color(0x4dc6e8); // Vibrant Ocean Cyan
  const highColor = new THREE.Color(0xff2a5f); // Vivid Hot Pink / Neon Rose for peak alert

  const col = new THREE.Color();
  if (powerT < 0.4) {
    col.copy(lowColor).lerp(midColor, powerT / 0.4);
  } else {
    col.copy(midColor).lerp(highColor, (powerT - 0.4) / 0.6);
  }

  col.multiplyScalar(0.35 + 0.65 * normConf);
  return col;
}

export function getRelativeZ(
  k: KeyResult,
  minZ: number,
  zRange: number,
): { relativeZ: number; amplifiedZ: number } {
  const isDummy = k.key.toLowerCase() === "_dummy_comma";
  const relativeZ = isDummy ? 0 : zRange > 0 ? (k.zSmoothed - minZ) / zRange : 0.5;
  return { relativeZ, amplifiedZ: Math.pow(relativeZ, LATENCY_POWER) };
}

export function computeZRange(surfaceKeys: KeyResult[]): {
  minZ: number;
  maxZ: number;
  zRange: number;
} {
  const active = surfaceKeys.filter((k) => k.key.toLowerCase() !== "_dummy_comma");
  const zValues = active.map((k) => k.zSmoothed);
  const minZ = zValues.length > 0 ? Math.min(...zValues) : 0;
  const maxZ = zValues.length > 0 ? Math.max(...zValues) : 1;
  return { minZ, maxZ, zRange: maxZ - minZ };
}

export interface SurfaceMeshData {
  positions: Float32Array;
  colors: Float32Array;
  indices: number[];
}

/** One subdivision pass per triangle (4 sub-triangles) for smoother height interpolation. */
export function subdivideSurfaceMesh(
  positions: Float32Array,
  colors: Float32Array,
  indices: number[],
): SurfaceMeshData {
  const posList: number[] = Array.from(positions);
  const colList: number[] = Array.from(colors);
  const midCache = new Map<string, number>();

  const vertexCount = () => posList.length / 3;

  const getMid = (a: number, b: number): number => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const cached = midCache.get(key);
    if (cached !== undefined) return cached;

    const ai = a * 3;
    const bi = b * 3;
    posList.push(
      (posList[ai] + posList[bi]) / 2,
      (posList[ai + 1] + posList[bi + 1]) / 2,
      (posList[ai + 2] + posList[bi + 2]) / 2,
    );
    colList.push(
      (colList[ai] + colList[bi]) / 2,
      (colList[ai + 1] + colList[bi + 1]) / 2,
      (colList[ai + 2] + colList[bi + 2]) / 2,
    );
    const idx = vertexCount() - 1;
    midCache.set(key, idx);
    return idx;
  };

  const nextIndices: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    const m01 = getMid(i0, i1);
    const m12 = getMid(i1, i2);
    const m20 = getMid(i2, i0);
    nextIndices.push(i0, m01, m20, i1, m12, m01, i2, m20, m12, m01, m12, m20);
  }

  return {
    positions: new Float32Array(posList),
    colors: new Float32Array(colList),
    indices: nextIndices,
  };
}

export interface MergedDropLinesData {
  positions: Float32Array;
  colors: Float32Array;
}

/** Merged vertical drop lines (one LineSegments draw call). */
export function buildMergedDropLines(
  keys: KeyResult[],
  topPositions: Map<string, THREE.Vector3>,
  minZ: number,
  zRange: number,
  maxConfidence: number,
): MergedDropLinesData | null {
  const active = keys.filter((k) => k.key.toLowerCase() !== "_dummy_comma");
  if (active.length === 0) return null;

  const positions: number[] = [];
  const colors: number[] = [];

  for (const k of active) {
    const top = topPositions.get(k.key.toLowerCase());
    if (!top) continue;

    const { relativeZ } = getRelativeZ(k, minZ, zRange);
    const normConf = maxConfidence > 0 ? Math.sqrt(k.confidence / maxConfidence) : 0;
    const col = surfaceVertexColor(relativeZ, normConf);

    positions.push(top.x, top.y, top.z, top.x, 0, top.z);
    colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}

/** Closed border polyline from inner keyboard footprint (y = 0). */
export function buildInnerBorderLinePoints(
  innerBorderPoints: Array<[number, number]>,
): THREE.Vector3[] {
  if (innerBorderPoints.length === 0) return [];
  const pts = innerBorderPoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
  pts.push(pts[0].clone());
  return pts;
}

export const SURFACE_BORDER_COLOR = CYL_COLORS.petalBorder;
