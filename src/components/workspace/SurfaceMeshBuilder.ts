import * as THREE from "three";
import { Delaunay } from "d3-delaunay";
import { KeyResult } from "@/lib/skdm";
import {
  IS_SURFACE_KEY,
  SURFACE_GAP,
  SURFACE_SCALE,
  generateSurfaceLayout,
  calculateSurfaceBorders,
} from "./geometryUtils";
import {
  TARGET_ELEVATION_SCALE,
  buildInnerBorderLinePoints,
  buildMergedDropLines,
  getRelativeZ,
  subdivideSurfaceMesh,
  surfaceVertexColor,
  SURFACE_BORDER_COLOR,
} from "./surfaceGeometry";
import { buildSurfaceBrandLogo } from "./surfaceBrandLogo";

const { layoutMap: KEY_LAYOUT, centerX, centerZ } = generateSurfaceLayout();
const { innerBorderPoints: _innerBorderPoints, outerBorderPoints: _outerBorderPoints } = calculateSurfaceBorders(KEY_LAYOUT);

export interface SurfaceMeshes {
  surfaceMesh: THREE.Mesh;
  wireframeMesh: THREE.Mesh;
  borderLine: THREE.Line | null;
  dropMesh: THREE.LineSegments | null;
  logo: THREE.Group;
}

export function getSurface3DPos(k: KeyResult, minZ: number, zRange: number, elevationScale: number) {
  const keyName = k.key.toLowerCase();
  const layout = KEY_LAYOUT[keyName];

  const { amplifiedZ } = getRelativeZ(k, minZ, zRange);
  const isDummy = keyName === "_dummy_comma";
  const keyElevation = isDummy ? 0 : (0.15 + amplifiedZ) * elevationScale;

  if (layout) {
    return new THREE.Vector3(layout.x, keyElevation, layout.z);
  }

  const x = (k.x - centerX) * SURFACE_SCALE;
  const z = ((2.0 - k.y) * (1 + SURFACE_GAP) - centerZ) * SURFACE_SCALE;
  return new THREE.Vector3(x, keyElevation, z);
}

export function buildSurfaceMeshes(
  surfaceKeys: KeyResult[],
  minZ: number,
  maxZ: number,
  zRange: number,
  isLanding: boolean
): SurfaceMeshes {
  const N = surfaceKeys.length;
  const M1 = _innerBorderPoints.length;
  const M2 = _outerBorderPoints.length;
  const totalVertices = N + M1 + M2;

  const positions = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);

  const maxConfidence = surfaceKeys.length > 0 ? Math.max(...surfaceKeys.map((k) => k.confidence), 1) : 1;
  const boundaryColor = new THREE.Color().setHSL(227 / 360, 0.35, 0.28);
  const topPositions = new Map<string, THREE.Vector3>();

  surfaceKeys.forEach((k, i) => {
    const pos = getSurface3DPos(k, minZ, zRange, TARGET_ELEVATION_SCALE);
    topPositions.set(k.key.toLowerCase(), pos.clone());
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    const { relativeZ } = getRelativeZ(k, minZ, zRange);
    const normConf = maxConfidence > 0 ? Math.sqrt(k.confidence / maxConfidence) : 0;
    const col = surfaceVertexColor(relativeZ, normConf);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  });

  _innerBorderPoints.forEach((bp, i) => {
    const idx = (N + i) * 3;
    positions[idx] = bp[0];
    positions[idx + 1] = 0;
    positions[idx + 2] = bp[1];
    colors[idx] = boundaryColor.r;
    colors[idx + 1] = boundaryColor.g;
    colors[idx + 2] = boundaryColor.b;
  });

  _outerBorderPoints.forEach((bp, i) => {
    const idx = (N + M1 + i) * 3;
    positions[idx] = bp[0];
    positions[idx + 1] = 0;
    positions[idx + 2] = bp[1];
    colors[idx] = boundaryColor.r;
    colors[idx + 1] = boundaryColor.g;
    colors[idx + 2] = boundaryColor.b;
  });

  let indices: number[] = [];
  if (N >= 3) {
    const points: Array<[number, number]> = [];
    surfaceKeys.forEach((k) => {
      const layout = KEY_LAYOUT[k.key.toLowerCase()];
      if (layout) {
        points.push([layout.x, layout.z]);
      } else {
        const x = (k.x - centerX) * SURFACE_SCALE;
        const z = ((2.0 - k.y) * (1 + SURFACE_GAP) - centerZ) * SURFACE_SCALE;
        points.push([x, z]);
      }
    });
    _innerBorderPoints.forEach((bp) => points.push([bp[0], bp[1]]));
    _outerBorderPoints.forEach((bp) => points.push([bp[0], bp[1]]));
    indices = Array.from(Delaunay.from(points).triangles);
  }

  let meshPositions: Float32Array = positions;
  let meshColors: Float32Array = colors;
  if (indices.length >= 3) {
    const subdivided = subdivideSurfaceMesh(positions, colors, indices);
    meshPositions = subdivided.positions;
    meshColors = subdivided.colors;
    indices = subdivided.indices;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(meshPositions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(meshColors, 3));
  if (indices.length > 0) {
    const IndexArray = indices.length > 65535 ? Uint32Array : Uint16Array;
    geometry.setIndex(Array.from(new IndexArray(indices)));
    geometry.computeVertexNormals();
  }

  const surfaceOpacity = isLanding ? 0.64 : 0.48;
  const surfaceMaterial = new THREE.MeshPhongMaterial({
    vertexColors: true,
    transparent: true,
    opacity: surfaceOpacity,
    side: THREE.FrontSide,
    shininess: 20,
    specular: new THREE.Color(0x4dc6e8),
    emissive: new THREE.Color(0x1a4055),
    emissiveIntensity: 0.35,
    flatShading: false,
    depthWrite: true,
  });
  surfaceMaterial.userData = { baseOpacity: surfaceOpacity };
  const surfaceMesh = new THREE.Mesh(geometry, surfaceMaterial);
  surfaceMesh.renderOrder = 1;

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x4dc6e8),
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  wireframeMaterial.userData = { baseOpacity: 0.12 };
  const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
  wireframeMesh.renderOrder = 2;

  let borderLine = null;
  const borderPoints = buildInnerBorderLinePoints(_innerBorderPoints);
  if (borderPoints.length > 1) {
    const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: SURFACE_BORDER_COLOR,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    borderMat.userData = { baseOpacity: 0.55 };
    borderLine = new THREE.Line(borderGeom, borderMat);
    borderLine.renderOrder = 1;
  }

  let dropMesh = null;
  const dropLines = buildMergedDropLines(surfaceKeys, topPositions, minZ, zRange, maxConfidence);
  if (dropLines) {
    const dropGeom = new THREE.BufferGeometry();
    dropGeom.setAttribute("position", new THREE.BufferAttribute(dropLines.positions, 3));
    dropGeom.setAttribute("color", new THREE.BufferAttribute(dropLines.colors, 3));
    const dropMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    dropMat.userData = { baseOpacity: 0.45 };
    dropMesh = new THREE.LineSegments(dropGeom, dropMat);
    dropMesh.renderOrder = 0;
  }

  const logo = buildSurfaceBrandLogo(surfaceOpacity);

  return { surfaceMesh, wireframeMesh, borderLine, dropMesh, logo };
}
