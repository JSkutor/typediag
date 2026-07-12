import * as THREE from "three";
import type { CylindricalVector } from "@/lib/skdm/cylindrical";
import { CYL_COLORS, toCylindricalCartesian } from "./geometryUtils";

/** Samples per arc between adjacent key endpoints on the petal rim. */
const SPLINE_STEPS = 10;

/** Latency → vertex color: bright accent cyan (fast) → main cyan (slow). Origin stays pink via CYL_COLORS.originNode. */
function latencyVertexColor(z: number): THREE.Color {
  const t = Math.min(1, Math.max(0, (z - 100) / 700));
  const fast = new THREE.Color(0x6dd4f0);
  const slow = new THREE.Color(0x4dc6e8);
  return fast.clone().lerp(slow, t);
}

function catmullRomPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return new THREE.Vector3(
    0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
}

export interface PetalGeometryData {
  positions: Float32Array;
  colors: Float32Array;
  indices: number[];
  borderPoints: THREE.Vector3[];
}

/**
 * Builds a smooth closed petal mesh: origin fan + Catmull-Rom rim
 * (스플라인 = 점들 사이를 부드러운 곡선으로 잇는 보간).
 */
export function buildSmoothPetalGeometry(
  sorted: CylindricalVector[],
  selectedFrom: string,
): PetalGeometryData {
  const n = sorted.length;
  const endpoints = sorted.map((v) => {
    const { vx, vy, vz } = toCylindricalCartesian(v);
    return {
      pos: new THREE.Vector3(vx, vy, vz),
      color: latencyVertexColor(v.z),
      fromKey: v.fromKey,
    };
  });

  const rimPositions: THREE.Vector3[] = [];
  const rimColors: THREE.Color[] = [];

  for (let i = 0; i < n; i++) {
    const p0 = endpoints[(i - 1 + n) % n].pos;
    const p1 = endpoints[i].pos;
    const p2 = endpoints[(i + 1) % n].pos;
    const p3 = endpoints[(i + 2) % n].pos;
    const c1 = endpoints[i].color;
    const c2 = endpoints[(i + 1) % n].color;
    const touchesSelected =
      selectedFrom &&
      (endpoints[i].fromKey === selectedFrom || endpoints[(i + 1) % n].fromKey === selectedFrom);

    for (let s = 0; s < SPLINE_STEPS; s++) {
      const t = s / SPLINE_STEPS;
      rimPositions.push(catmullRomPoint(p0, p1, p2, p3, t));
      const col = c1.clone().lerp(c2, t);
      if (selectedFrom) {
        if (touchesSelected) {
          col.multiplyScalar(1.1);
        } else {
          col.multiplyScalar(0.62);
        }
      }
      rimColors.push(col);
    }
  }

  const originColor = new THREE.Color(CYL_COLORS.originNode);
  const verts: number[] = [0, 0, 0];
  const cols: number[] = [originColor.r, originColor.g, originColor.b];

  for (let i = 0; i < rimPositions.length; i++) {
    const p = rimPositions[i];
    verts.push(p.x, p.y, p.z);
    cols.push(rimColors[i].r, rimColors[i].g, rimColors[i].b);
  }

  const rimCount = rimPositions.length;
  const indices: number[] = [];
  for (let i = 0; i < rimCount; i++) {
    const next = (i + 1) % rimCount;
    indices.push(0, i + 1, next + 1);
  }

  const borderPoints: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = endpoints[(i - 1 + n) % n].pos;
    const p1 = endpoints[i].pos;
    const p2 = endpoints[(i + 1) % n].pos;
    const p3 = endpoints[(i + 2) % n].pos;
    for (let s = 0; s < SPLINE_STEPS; s++) {
      borderPoints.push(catmullRomPoint(p0, p1, p2, p3, s / SPLINE_STEPS));
    }
  }
  if (borderPoints.length > 0) borderPoints.push(borderPoints[0].clone());

  const IndexArray = indices.length > 65535 ? Uint32Array : Uint16Array;
  return {
    positions: new Float32Array(verts),
    colors: new Float32Array(cols),
    indices: Array.from(new IndexArray(indices)),
    borderPoints,
  };
}

/**
 * Builds only the vertex color array for the petal mesh.
 * Fast path for when only the highlight changes.
 */
export function buildPetalVertexColors(
  sorted: CylindricalVector[],
  selectedFrom: string,
): Float32Array {
  const n = sorted.length;
  const endpoints = sorted.map((v) => {
    return {
      color: latencyVertexColor(v.z),
      fromKey: v.fromKey,
    };
  });

  const rimColors: THREE.Color[] = [];

  for (let i = 0; i < n; i++) {
    const c1 = endpoints[i].color;
    const c2 = endpoints[(i + 1) % n].color;
    const touchesSelected =
      selectedFrom &&
      (endpoints[i].fromKey === selectedFrom || endpoints[(i + 1) % n].fromKey === selectedFrom);

    for (let s = 0; s < SPLINE_STEPS; s++) {
      const t = s / SPLINE_STEPS;
      const col = c1.clone().lerp(c2, t);
      if (selectedFrom) {
        if (touchesSelected) {
          col.multiplyScalar(1.1);
        } else {
          col.multiplyScalar(0.62);
        }
      }
      rimColors.push(col);
    }
  }

  const originColor = new THREE.Color(CYL_COLORS.originNode);
  const cols: number[] = [originColor.r, originColor.g, originColor.b];

  for (let i = 0; i < rimColors.length; i++) {
    cols.push(rimColors[i].r, rimColors[i].g, rimColors[i].b);
  }

  return new Float32Array(cols);
}

/** Push HUD labels outward from the projected origin so they don't cover rim nodes. */
export function offsetHudLabelsFromAnchor(
  coords: { fromKey: string; x: number; y: number; visible: boolean }[],
  anchorX: number,
  anchorY: number,
  offsetPx = 26,
): { fromKey: string; x: number; y: number; visible: boolean }[] {
  return coords.map((c) => {
    if (!c.visible) return c;

    const dx = c.x - anchorX;
    const dy = c.y - anchorY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) {
      return { ...c, x: c.x + offsetPx, y: c.y };
    }

    const scale = (dist + offsetPx) / dist;
    return {
      ...c,
      x: anchorX + dx * scale,
      y: anchorY + dy * scale,
    };
  });
}
