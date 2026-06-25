import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  CYL_DRAWER_TOGGLE_WIDTH_PX,
  computeDrawerContentShiftPx,
  screenPxToWorldPan,
} from "./cylindricalDrawerInset";

describe("cylindricalDrawerInset", () => {
  describe("computeDrawerContentShiftPx", () => {
    it("returns 0 when drawer body is collapsed", () => {
      expect(computeDrawerContentShiftPx(0)).toBe(0);
    });

    it("centers content in the remaining viewport when body is expanded", () => {
      expect(computeDrawerContentShiftPx(1000)).toBe((CYL_DRAWER_TOGGLE_WIDTH_PX + 1000) / 2);
    });

    it("reaches 0 continuously as the body collapses (no toggle-width snap)", () => {
      expect(computeDrawerContentShiftPx(48)).toBe(48);
      expect(computeDrawerContentShiftPx(1)).toBe(1);
      expect(computeDrawerContentShiftPx(0)).toBe(0);
    });
  });

  describe("screenPxToWorldPan", () => {
    it("returns zero vector for zero pixel delta", () => {
      const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
      camera.position.set(7, 8, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const pan = screenPxToWorldPan(0, camera, 1920, new THREE.Vector3(0, 0, 0));
      expect(pan.x).toBe(0);
      expect(pan.y).toBe(0);
      expect(pan.z).toBe(0);
    });

    it("pans along camera right axis for positive pixel delta", () => {
      const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const lookAt = new THREE.Vector3(0, 0, 0);
      const pan = screenPxToWorldPan(100, camera, 1000, lookAt);

      expect(pan.x).toBeGreaterThan(0);
      expect(Math.abs(pan.y)).toBeLessThan(1e-10);
      expect(Math.abs(pan.z)).toBeLessThan(1e-10);
    });
  });
});
