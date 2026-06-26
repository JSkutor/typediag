import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildSurfaceBrandLogo } from "./surfaceBrandLogo";

describe("buildSurfaceBrandLogo", () => {
  it("creates embossed Type + Diag meshes anchored on the surface floor", () => {
    const group = buildSurfaceBrandLogo(0.5);
    expect(group.children.length).toBe(2);

    const meshes = group.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    expect(meshes).toHaveLength(2);
    expect(meshes.every((m) => m.geometry.attributes.position.count > 0)).toBe(true);

    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(0.5);
    expect(bounds.max.x).toBeCloseTo(group.position.x, 0);
    expect(bounds.max.z).toBeCloseTo(group.position.z, 0);

    for (const mesh of meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
});
