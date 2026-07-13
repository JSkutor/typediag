import * as THREE from "three";
import { CylindricalVector } from "@/lib/skdm/cylindrical";
import { CYL_COLORS as C, CYLINDRICAL_MAX_RADIUS, toCylindricalCartesian } from "./geometryUtils";
import { buildSmoothPetalGeometry } from "./cylindricalPetalGeometry";

export function buildFloorGroup(): THREE.Group {
  const group = new THREE.Group();
  const floorRadius = CYLINDRICAL_MAX_RADIUS * 1.25;
  const floorDisc = new THREE.Mesh(
    new THREE.CircleGeometry(floorRadius, 72),
    new THREE.MeshBasicMaterial({
      color: C.floorDisc,
      side: THREE.DoubleSide,
      depthWrite: true,
    }),
  );
  floorDisc.rotation.x = -Math.PI / 2;
  floorDisc.position.y = -0.02;
  floorDisc.renderOrder = -2;
  group.add(floorDisc);

  const polarGrid = new THREE.PolarGridHelper(floorRadius, 16, 8, 64, C.gridMain, C.gridSub);
  polarGrid.position.y = 0.001;
  polarGrid.renderOrder = -2;
  polarGrid.traverse((child) => {
    if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      const mat = child.material;
      if (mat instanceof THREE.Material) {
        mat.transparent = true;
        mat.opacity = 0.38;
        mat.depthWrite = false;
      }
    }
  });
  group.add(polarGrid);
  group.renderOrder = -2;
  return group;
}

export function buildInactiveVectorLine(v: CylindricalVector): THREE.Line {
  const { vx, vy, vz } = toCylindricalCartesian(v);
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(vx, vy, vz)];
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: C.inactive,
    transparent: true,
    opacity: 0.1,
  });
  const line = new THREE.Line(geom, mat);
  line.renderOrder = 0;
  return line;
}

export function buildActiveVectorGroup(
  vx: number,
  vy: number,
  vz: number,
): { targetMesh: THREE.Mesh; projectionGroup: THREE.Group; visuals: THREE.Group } {
  const visuals = new THREE.Group();

  // Target Mesh
  const tGeom = new THREE.SphereGeometry(0.01, 8, 8);
  const tMat = new THREE.MeshBasicMaterial({ visible: false });
  const targetMesh = new THREE.Mesh(tGeom, tMat);
  targetMesh.position.set(vx, vy, vz);
  visuals.add(targetMesh);

  // Spoke
  const end = new THREE.Vector3(vx, vy, vz);
  const dir = end.clone();
  const length = dir.length();
  if (length >= 0.05) {
    dir.normalize();

    const shaftGeom = new THREE.CylinderGeometry(0.045, 0.045, length, 10, 1, true);
    shaftGeom.translate(0, length / 2, 0);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: C.targetNode,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shaft = new THREE.Mesh(shaftGeom, shaftMat);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    shaft.renderOrder = 2;
    visuals.add(shaft);

    const coreGeom = new THREE.CylinderGeometry(0.018, 0.018, length, 8, 1, true);
    coreGeom.translate(0, length / 2, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    core.quaternion.copy(shaft.quaternion);
    core.renderOrder = 3;
    visuals.add(core);
  }

  // Endpoint Marker
  const node = new THREE.Group();
  node.position.set(vx, vy, vz);

  const shellGeom = new THREE.SphereGeometry(0.1, 24, 24);
  const shellMat = new THREE.MeshBasicMaterial({
    color: C.targetNode,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(shellGeom, shellMat);
  shell.renderOrder = 3;
  node.add(shell);

  const coreGeom = new THREE.SphereGeometry(0.068, 28, 28);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xf0f7fa,
    emissive: C.targetNode,
    emissiveIntensity: 0.07,
    roughness: 0.68,
    metalness: 0.04,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeom, coreMat);
  core.renderOrder = 4;
  node.add(core);

  visuals.add(node);

  // Projection Group
  const projectionGroup = new THREE.Group();
  const radPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(vx, 0, vz)];
  const radGeom = new THREE.BufferGeometry().setFromPoints(radPts);
  const radMat = new THREE.LineDashedMaterial({
    color: C.radLine,
    dashSize: 0.2,
    gapSize: 0.1,
  });
  const radLine = new THREE.Line(radGeom, radMat);
  radLine.computeLineDistances();
  projectionGroup.add(radLine);
  projectionGroup.renderOrder = 2;

  return { targetMesh, projectionGroup, visuals };
}

export function buildPetalMeshes(
  vectors: CylindricalVector[],
  selectedFrom: string,
): {
  petalMesh: THREE.Mesh | null;
  petalBorder: THREE.Line | null;
  originMarker: THREE.Mesh | null;
} {
  if (vectors.length < 3) return { petalMesh: null, petalBorder: null, originMarker: null };

  const sorted = [...vectors].sort((a, b) => a.theta - b.theta);
  const { positions, colors, indices, borderPoints } = buildSmoothPetalGeometry(
    sorted,
    selectedFrom,
  );

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    shininess: 30,
    depthWrite: false,
  });

  const petalMesh = new THREE.Mesh(geom, mat);
  petalMesh.renderOrder = 1;

  const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
  const borderMat = new THREE.LineBasicMaterial({
    color: C.petalBorder,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const petalBorder = new THREE.Line(borderGeom, borderMat);
  petalBorder.renderOrder = 1;

  const originGeom = new THREE.SphereGeometry(0.055, 16, 16);
  const originMat = new THREE.MeshBasicMaterial({
    color: C.originNode,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const originMarker = new THREE.Mesh(originGeom, originMat);
  originMarker.renderOrder = 1;

  return { petalMesh, petalBorder, originMarker };
}
