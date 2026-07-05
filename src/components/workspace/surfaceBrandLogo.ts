import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import helvetikerBold from "three/examples/fonts/helvetiker_bold.typeface.json";
import { SURFACE_LOGO_ANCHOR } from "./geometryUtils";

const LOGO_TEXT_OPTS = {
  size: 10.5,
  depth: 2.4,
  curveSegments: 6,
  bevelEnabled: true,
  bevelThickness: 0.38,
  bevelSize: 0.22,
  bevelSegments: 2,
} as const;

const LOGO_GAP = 0.65;
/** Slightly above y=0 floor to avoid z-fighting with the Delaunay mesh. */
export const LOGO_FLOOR_LIFT = 0.06;

let cachedFont: Font | null = null;

function getBrandFont(): Font {
  if (!cachedFont) {
    cachedFont = new FontLoader().parse(helvetikerBold as Parameters<FontLoader["parse"]>[0]);
  }
  return cachedFont;
}

function createEmbossedPart(
  text: string,
  font: Font,
  material: THREE.MeshPhongMaterial,
): THREE.Mesh {
  const geometry = new TextGeometry(text, { font, ...LOGO_TEXT_OPTS });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** Raised TypeDiag wordmark — sits on the surface floor in the bottom-right pad. */
export function buildSurfaceBrandLogo(baseOpacity: number): THREE.Group {
  const font = getBrandFont();

  const logoMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color(0x3a4049),
    specular: new THREE.Color(0x6ecde8),
    shininess: 28,
    emissive: new THREE.Color(0x141820),
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: baseOpacity,
    flatShading: false,
  });
  logoMaterial.userData = { baseOpacity };

  const typeMesh = createEmbossedPart("Type", font, logoMaterial);
  const diagMesh = createEmbossedPart("Diag", font, logoMaterial);

  typeMesh.geometry.computeBoundingBox();
  const typeBox = typeMesh.geometry.boundingBox!;
  const typeWidth = typeBox.max.x - typeBox.min.x;

  diagMesh.position.x = typeWidth + LOGO_GAP;

  const group = new THREE.Group();
  group.add(typeMesh, diagMesh);

  const bounds = new THREE.Box3().setFromObject(group);
  const offsetX = -bounds.max.x;
  const offsetY = -bounds.min.y;
  typeMesh.position.x += offsetX;
  typeMesh.position.y += offsetY;
  diagMesh.position.x += offsetX;
  diagMesh.position.y += offsetY;

  group.rotation.x = -Math.PI / 2;
  group.position.set(SURFACE_LOGO_ANCHOR.x, LOGO_FLOOR_LIFT, SURFACE_LOGO_ANCHOR.z);

  group.renderOrder = 1;
  return group;
}
