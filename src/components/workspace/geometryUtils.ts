import { buildLayout } from "@/lib/skdm/layout";
import type { CylindricalVector } from "@/lib/skdm/cylindrical";

// ---------------------------------------------------------------------------
// Cylindrical 3D Constants & Utils
// ---------------------------------------------------------------------------
export const CYLINDRICAL_MAX_RADIUS = 8.0; // max XZ radius (frequency)
export const CYLINDRICAL_MAX_HEIGHT = 6.0; // max Y height (latency)
/** Normalized r when a fromKey has no reference transitions (petal rim stays off origin). */
export const CYLINDRICAL_MIN_NORMALIZED_R = 0.12;

/** Functional colors for 3D data elements */
export const CYL_COLORS = {
  sceneBg: 0x1e2024,
  originNode: 0xec4899,
  targetNode: 0x4dc6e8,
  vectorArrow: 0xf59e0b,
  inactive: 0x3b82f6,
  inactiveNode: 0x4dc6e8,
  cylinder: 0xa194b8,
  dropLine: 0x57d68d,
  radLine: 0x8d929b,
  angleArc: 0xfbbf24,
  gridMain: 0x323640,
  gridSub: 0x282b30,
  /** Same family as sceneBg — barely lifted so grid reads without clashing. */
  floorDisc: 0x1f2226,
  petalBorder: 0x4dc6e8,
};

/** Cylindrical → Three.js Cartesian (Y-up) */
export function toCylindricalCartesian(v: CylindricalVector) {
  // Use normalized values if available, otherwise fallback to old linear scale
  const normR = v.normalizedR ?? (v.r * 0.3) / CYLINDRICAL_MAX_RADIUS;
  const normZ = v.normalizedZ ?? (v.z * 0.015) / CYLINDRICAL_MAX_HEIGHT;

  return {
    vx: normR * CYLINDRICAL_MAX_RADIUS * Math.cos(v.theta),
    vy: normZ * CYLINDRICAL_MAX_HEIGHT,
    vz: normR * CYLINDRICAL_MAX_RADIUS * Math.sin(v.theta),
  };
}

// ---------------------------------------------------------------------------
// Surface 3D Constants & Utils
// ---------------------------------------------------------------------------
export const IS_SURFACE_KEY = (key: string) => {
  const lower = key.toLowerCase();
  return /^[a-z]$/.test(lower) || lower === "_dummy_comma";
};

export const SURFACE_GAP = 0.1667;
export const SURFACE_SCALE = 70;
export const SURFACE_Y_OFFSET = 2.0;

export interface SurfaceLayoutConfig {
  x: number;
  z: number;
  w: number;
  h: number;
}

/** Generates the 3D surface layout mapping for keys based on 2D layout */
export function generateSurfaceLayout() {
  const layoutMap: Record<string, SurfaceLayoutConfig> = {};
  const rawLayout = buildLayout();

  for (const [keyName, pos] of Object.entries(rawLayout)) {
    const z = (2.0 - pos.y) * (1 + SURFACE_GAP);
    layoutMap[keyName] = { x: pos.x, z, w: 1.0, h: 1.0 };
  }

  let rawMinX = Infinity;
  let rawMaxX = -Infinity;
  let rawMinZ = Infinity;
  let rawMaxZ = -Infinity;

  for (const k in layoutMap) {
    if (!IS_SURFACE_KEY(k)) continue;
    const layout = layoutMap[k];
    if (layout.x - 0.5 < rawMinX) rawMinX = layout.x - 0.5;
    if (layout.x + 0.5 > rawMaxX) rawMaxX = layout.x + 0.5;
    if (layout.z - 0.5 < rawMinZ) rawMinZ = layout.z - 0.5;
    if (layout.z + 0.5 > rawMaxZ) rawMaxZ = layout.z + 0.5;
  }

  const centerX = (rawMinX + rawMaxX) / 2;
  const centerZ = (rawMinZ + rawMaxZ) / 2;

  for (const k in layoutMap) {
    layoutMap[k].x = (layoutMap[k].x - centerX) * SURFACE_SCALE;
    layoutMap[k].z = (layoutMap[k].z - centerZ) * SURFACE_SCALE;
    layoutMap[k].w *= SURFACE_SCALE;
    layoutMap[k].h *= SURFACE_SCALE;
  }

  return { layoutMap, centerX, centerZ, rawMinX, rawMaxX, rawMinZ, rawMaxZ };
}

/** Helper to generate boundary points forming a box */
export function generateBoxPoints(
  bMinX: number,
  bMaxX: number,
  bMinZ: number,
  bMaxZ: number,
  step: number,
) {
  const points: Array<[number, number]> = [];
  const xSteps = Math.ceil((bMaxX - bMinX) / step);
  for (let i = 0; i <= xSteps; i++) {
    const t = i / xSteps;
    const x = bMinX + t * (bMaxX - bMinX);
    points.push([x, bMinZ]);
    points.push([x, bMaxZ]);
  }
  const zSteps = Math.ceil((bMaxZ - bMinZ) / step);
  for (let i = 1; i < zSteps; i++) {
    const t = i / zSteps;
    const z = bMinZ + t * (bMaxZ - bMinZ);
    points.push([bMinX, z]);
    points.push([bMaxX, z]);
  }
  return points;
}

/** Calculates inner and outer boundary points for the 3D surface mesh */
export function calculateSurfaceBorders(layoutMap: Record<string, SurfaceLayoutConfig>) {
  const q = layoutMap["q"];
  const p = layoutMap["p"];
  const l = layoutMap["l"];
  const m = layoutMap["m"];
  const z = layoutMap["z"];
  const a = layoutMap["a"];

  let innerBorderPoints: Array<[number, number]> = [];

  if (q && p && l && m && z && a) {
    const vertices: Array<[number, number]> = [
      [q.x - q.w / 2, q.z - q.h / 2],
      [p.x + p.w / 2, p.z - p.h / 2],
      [p.x + p.w / 2, p.z + p.h / 2],
      [l.x + l.w / 2, l.z - l.h / 2],
      [l.x + l.w / 2, l.z + l.h / 2],
      [m.x + m.w / 2, m.z - m.h / 2],
      [m.x + m.w / 2, m.z + m.h / 2],
      [z.x - z.w / 2, z.z + z.h / 2],
      [z.x - z.w / 2, z.z - z.h / 2],
      [a.x - a.w / 2, a.z + a.h / 2],
      [a.x - a.w / 2, a.z - a.h / 2],
      [q.x - q.w / 2, q.z + q.h / 2],
    ];

    const step = SURFACE_SCALE;
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const dist = Math.sqrt(dx * dx + dz * dz);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        innerBorderPoints.push([p1[0] + dx * t, p1[1] + dz * t]);
      }
    }
  } else {
    // Fallback
    let innerMinX = Infinity,
      innerMaxX = -Infinity,
      innerMinZ = Infinity,
      innerMaxZ = -Infinity;
    for (const k in layoutMap) {
      if (!IS_SURFACE_KEY(k)) continue;
      const layout = layoutMap[k];
      if (layout.x - layout.w / 2 < innerMinX) innerMinX = layout.x - layout.w / 2;
      if (layout.x + layout.w / 2 > innerMaxX) innerMaxX = layout.x + layout.w / 2;
      if (layout.z - layout.h / 2 < innerMinZ) innerMinZ = layout.z - layout.h / 2;
      if (layout.z + layout.h / 2 > innerMaxZ) innerMaxZ = layout.z + layout.h / 2;
    }
    innerBorderPoints = generateBoxPoints(
      innerMinX,
      innerMaxX,
      innerMinZ,
      innerMaxZ,
      SURFACE_SCALE,
    );
  }

  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const k in layoutMap) {
    if (!IS_SURFACE_KEY(k)) continue;
    const layout = layoutMap[k];
    if (layout.x - layout.w / 2 < minX) minX = layout.x - layout.w / 2;
    if (layout.x + layout.w / 2 > maxX) maxX = layout.x + layout.w / 2;
    if (layout.z - layout.h / 2 < minZ) minZ = layout.z - layout.h / 2;
    if (layout.z + layout.h / 2 > maxZ) maxZ = layout.z + layout.h / 2;
  }
  const PADDING = 0.5 * SURFACE_SCALE;
  const outerBorderPoints = generateBoxPoints(
    minX - PADDING,
    maxX + PADDING,
    minZ - PADDING,
    maxZ + PADDING,
    SURFACE_SCALE,
  );

  return { innerBorderPoints, outerBorderPoints };
}
