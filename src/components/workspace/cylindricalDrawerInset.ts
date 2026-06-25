import * as THREE from "three";

/** Width of `.cyl-drawer__toggle` in px — keep in sync with cylindrical-visualizer.css */
export const CYL_DRAWER_TOGGLE_WIDTH_PX = 40;

/**
 * Horizontal screen shift so the 3D scene stays centered in the viewport
 * area not covered by the left diagnostics drawer.
 * Pass the live drawer body width (e.g. from ResizeObserver) for CSS sync.
 */
export function computeDrawerContentShiftPx(bodyWidthPx: number): number {
  if (bodyWidthPx <= 0) return 0;
  return (CYL_DRAWER_TOGGLE_WIDTH_PX + bodyWidthPx) / 2;
}

const _right = new THREE.Vector3();

/**
 * Convert a horizontal screen-pixel delta into a world-space pan along the
 * camera's right axis (positive = scene moves right on screen).
 */
export function screenPxToWorldPan(
  pixelDelta: number,
  camera: THREE.PerspectiveCamera,
  viewportWidth: number,
  lookAt: THREE.Vector3,
): THREE.Vector3 {
  if (pixelDelta === 0 || viewportWidth <= 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  const distance = camera.position.distanceTo(lookAt);
  const vFovRad = (camera.fov * Math.PI) / 180;
  const visibleWidth = 2 * Math.tan(vFovRad / 2) * distance * camera.aspect;
  const worldDelta = (pixelDelta / viewportWidth) * visibleWidth;

  _right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  return _right.clone().multiplyScalar(worldDelta);
}
