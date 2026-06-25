/**
 * Cylindrical3DManager — Three.js imperative manager for the
 * SKDM Cylindrical Vector Visualizer.
 *
 * Ported from the standalone three_test.js sub-project.
 * Follows the same pattern as Surface3DManager.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CylindricalVector } from "@/lib/skdm/cylindrical";
import { CYL_COLORS as C, CYLINDRICAL_MAX_RADIUS, toCylindricalCartesian } from "./geometryUtils";
import { buildSmoothPetalGeometry, buildPetalVertexColors } from "./cylindricalPetalGeometry";

// ---------------------------------------------------------------------------
// Constants moved to geometryUtils.ts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CylindricalToggles {
  grid: boolean;
  projections: boolean;
  petal: boolean;
  autoRotate: boolean;
}

export interface LabelProjection {
  originX: number;
  originY: number;
  originVisible: boolean;
  targetX: number;
  targetY: number;
  targetVisible: boolean;
  vectorCoords?: {
    fromKey: string;
    x: number;
    y: number;
    visible: boolean;
  }[];
}

export interface CartesianCoords {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Manager Class
// ---------------------------------------------------------------------------

export class Cylindrical3DManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private isDisposed = false;

  private visualGroup = new THREE.Group();
  private floorGroup = new THREE.Group();
  private pointLight: THREE.PointLight;

  // Toggle-controlled mesh references
  private projectionGroup: THREE.Group | null = null;
  private petalMesh: THREE.Mesh | null = null;
  private petalBorder: THREE.Line | null = null;
  private originMarker: THREE.Mesh | null = null;

  // Target mesh for label projection
  private targetMesh: THREE.Mesh | null = null;
  private curCartesian: CartesianCoords = { x: 0, y: 0, z: 0 };
  private vectors: CylindricalVector[] = [];
  private vectorSignature = "";

  private reqId = 0;
  private needsRender = true;
  private width: number;
  private height: number;
  private drawerShiftPx = 0;
  private toggles: CylindricalToggles = {
    grid: true,
    projections: false,
    petal: true,
    autoRotate: false,
  };

  /** Called each frame with projected 2D label coordinates. */
  public onLabelsUpdate?: (labels: LabelProjection) => void;

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(C.sceneBg);
    this.scene.fog = new THREE.FogExp2(C.sceneBg, 0.014);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(7, 8, 10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // Disable shadow map for performance
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.18;
    this.controls.rotateSpeed = 1.65;
    this.controls.zoomSpeed = 1.2;
    this.controls.enablePan = false;
    this.controls.panSpeed = 1.2;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;

    this.controls.addEventListener("change", () => {
      this.needsRender = true;
    });

    // Visual group
    this.scene.add(this.visualGroup);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.28);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 15, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    this.pointLight = new THREE.PointLight(C.targetNode, 1.5, 15);
    this.scene.add(this.pointLight);

    // Floor: opaque disc (depthWrite) + polar grid — always drawn before petal (renderOrder -2)
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
    this.floorGroup.add(floorDisc);

    const polarGrid = new THREE.PolarGridHelper(
      floorRadius,
      16,
      8,
      64,
      C.gridMain,
      C.gridSub,
    );
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
    this.floorGroup.add(polarGrid);
    this.floorGroup.renderOrder = -2;
    this.scene.add(this.floorGroup);

    // Start render loop
    this.animate = this.animate.bind(this);
    this.reqId = requestAnimationFrame(this.animate);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Disable zoom and pan, but keep rotation enabled. Used on landing page. */
  public lockControls(): void {
    this.controls.enableRotate = true;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
  }

  /** Rebuild the entire 3D scene for a new set of vectors / selection. */
  public updateScene(vectors: CylindricalVector[], selectedFrom: string): void {
    const nextSignature = this.buildVectorSignature(vectors);
    const geometryUnchanged = nextSignature === this.vectorSignature && vectors.length > 0;

    this.vectors = vectors;

    if (geometryUnchanged) {
      this.updateSelection(vectors, selectedFrom);
      return;
    }

    this.vectorSignature = nextSignature;
    this.clearVisualGroup();
    if (vectors.length === 0) return;

    // 0. Petal surface (needs ≥ 3 vectors)
    this.buildPetalSurface(vectors, selectedFrom);

    this.rebuildVectorHighlights(vectors, selectedFrom);

    this.applyToggles();
    this.needsRender = true;
  }

  /** Update toggle visibility states. */
  public setToggles(toggles: CylindricalToggles): void {
    this.toggles = { ...toggles };
    this.applyToggles();
    this.needsRender = true;
  }

  /** Resize the renderer to match a new container size. */
  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.renderer.setSize(w, h);
    this.applyDrawerViewOffset();
    this.needsRender = true;
  }

  /**
   * Shift scene content right so it stays centered when the left drawer opens.
   * `shiftPx` should track the drawer body width via ResizeObserver for CSS sync.
   */
  public setDrawerShiftPx(shiftPx: number): void {
    const next = Math.max(0, shiftPx);
    if (Math.abs(next - this.drawerShiftPx) < 0.25) return;
    this.drawerShiftPx = next;
    this.applyDrawerViewOffset();
    this.needsRender = true;
  }

  /** Tear down everything. */
  public dispose(): void {
    this.isDisposed = true;
    if (this.camera.view) this.camera.clearViewOffset();
    this.onLabelsUpdate = undefined;
    cancelAnimationFrame(this.reqId);
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  // -----------------------------------------------------------------------
  // Internal: Scene builders
  // -----------------------------------------------------------------------

  private clearVisualGroup(): void {
    while (this.visualGroup.children.length > 0) {
      const child = this.visualGroup.children[0];
      this.visualGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
    }
    this.projectionGroup = null;
    this.petalMesh = null;
    this.petalBorder = null;
    this.originMarker = null;
    this.targetMesh = null;
  }

  private buildVectorSignature(vectors: CylindricalVector[]): string {
    return vectors.map((v) => `${v.fromKey}:${v.theta}:${v.r}:${v.z}`).join("|");
  }

  /** Fast path when only the highlighted fromKey changes. */
  private updateSelection(vectors: CylindricalVector[], selectedFrom: string): void {
    this.updatePetalHighlight(vectors, selectedFrom);
    this.clearVectorHighlights();
    this.rebuildVectorHighlights(vectors, selectedFrom);
    this.applyToggles();
    this.needsRender = true;
  }

  private updatePetalHighlight(vectors: CylindricalVector[], selectedFrom: string): void {
    if (!this.petalMesh || vectors.length < 3) return;

    const sorted = [...vectors].sort((a, b) => a.theta - b.theta);
    const colors = buildPetalVertexColors(sorted, selectedFrom);
    const colorAttr = this.petalMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
    colorAttr.array.set(colors);
    colorAttr.needsUpdate = true;
  }

  private clearVectorHighlights(): void {
    const keep = new Set<THREE.Object3D>();
    if (this.petalMesh) keep.add(this.petalMesh);
    if (this.petalBorder) keep.add(this.petalBorder);
    if (this.originMarker) keep.add(this.originMarker);

    const toRemove = this.visualGroup.children.filter((child) => !keep.has(child));
    for (const child of toRemove) {
      this.visualGroup.remove(child);
    }
    this.projectionGroup = null;
    this.targetMesh = null;
  }

  private rebuildVectorHighlights(vectors: CylindricalVector[], selectedFrom: string): void {
    for (const v of vectors) {
      if (v.fromKey === selectedFrom) continue;
      this.addInactiveVector(v);
    }

    const active = vectors.find((v) => v.fromKey === selectedFrom);
    if (active) {
      this.buildActiveVector(active);
    }
  }

  /** Dim guide line for non-selected incoming keys. */
  private addInactiveVector(v: CylindricalVector): void {
    const { vx, vy, vz } = this.toCartesian(v);
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(vx, vy, vz)];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: C.inactive,
      transparent: true,
      opacity: 0.1,
    });
    const line = new THREE.Line(geom, mat);
    line.renderOrder = 0;
    this.visualGroup.add(line);
  }

  /** Build the highlighted active vector: spoke, endpoint beacon, optional floor arc. */
  private buildActiveVector(v: CylindricalVector): void {
    const { vx, vy, vz } = this.toCartesian(v);
    this.curCartesian = { x: vx, y: vy, z: vz };

    this.pointLight.position.set(vx, vy, vz);
    this.pointLight.color.setHex(C.targetNode);
    this.pointLight.intensity = 0.32;
    this.pointLight.distance = 10;

    const tGeom = new THREE.SphereGeometry(0.01, 8, 8);
    const tMat = new THREE.MeshBasicMaterial({ visible: false });
    this.targetMesh = new THREE.Mesh(tGeom, tMat);
    this.targetMesh.position.set(vx, vy, vz);
    this.visualGroup.add(this.targetMesh);

    this.addActiveSpoke(vx, vy, vz);
    this.addEndpointMarker(vx, vy, vz);

    this.projectionGroup = new THREE.Group();

    const radPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(vx, 0, vz)];
    const radGeom = new THREE.BufferGeometry().setFromPoints(radPts);
    const radMat = new THREE.LineDashedMaterial({
      color: C.radLine,
      dashSize: 0.2,
      gapSize: 0.1,
    });
    const radLine = new THREE.Line(radGeom, radMat);
    radLine.computeLineDistances();
    this.projectionGroup.add(radLine);

    this.projectionGroup.renderOrder = 2;
    this.visualGroup.add(this.projectionGroup);
  }

  private addActiveSpoke(vx: number, vy: number, vz: number): void {
    const end = new THREE.Vector3(vx, vy, vz);
    const dir = end.clone();
    const length = dir.length();
    if (length < 0.05) return;

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
    this.visualGroup.add(shaft);

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
    this.visualGroup.add(core);
  }

  /** Pearl-like rim node with a faint outer shell. */
  private addEndpointMarker(vx: number, vy: number, vz: number): void {
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

    this.visualGroup.add(node);
  }

  /** Build smooth petal surface (spline rim) through origin. */
  private buildPetalSurface(vectors: CylindricalVector[], selectedFrom: string): void {
    if (vectors.length < 3) return;

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

    this.petalMesh = new THREE.Mesh(geom, mat);
    this.petalMesh.renderOrder = 1;
    this.visualGroup.add(this.petalMesh);

    const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: C.petalBorder,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.petalBorder = new THREE.Line(borderGeom, borderMat);
    this.petalBorder.renderOrder = 1;
    this.visualGroup.add(this.petalBorder);

    const originGeom = new THREE.SphereGeometry(0.055, 16, 16);
    const originMat = new THREE.MeshBasicMaterial({
      color: C.originNode,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.originMarker = new THREE.Mesh(originGeom, originMat);
    this.originMarker.renderOrder = 1;
    this.visualGroup.add(this.originMarker);
  }

  // -----------------------------------------------------------------------
  // Internal: Geometry helpers
  // -----------------------------------------------------------------------

  /** Cylindrical → Three.js Cartesian (Y-up). */
  private toCartesian(v: CylindricalVector): { vx: number; vy: number; vz: number } {
    return toCylindricalCartesian(v);
  }

  /** Volumetric 3D arrow (cylinder shaft + cone tip). */
  private create3DArrow(start: THREE.Vector3, end: THREE.Vector3, color: number): THREE.Group {
    const group = new THREE.Group();
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    if (length < 0.1) return group;

    const shaftRadius = 0.08;
    const headLength = Math.min(0.6, length * 0.25);
    const headRadius = 0.18;
    const shaftLength = length - headLength;

    if (shaftLength > 0) {
      const sGeom = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 16);
      sGeom.translate(0, shaftLength / 2, 0);
      const sMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });
      group.add(new THREE.Mesh(sGeom, sMat));
    }

    const cGeom = new THREE.ConeGeometry(headRadius, headLength, 16);
    cGeom.translate(0, length - headLength / 2, 0);
    const cMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    group.add(new THREE.Mesh(cGeom, cMat));

    const up = new THREE.Vector3(0, 1, 0);
    direction.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, direction);
    group.setRotationFromQuaternion(quat);
    group.position.copy(start);

    return group;
  }

  // -----------------------------------------------------------------------
  // Internal: Toggle visibility
  // -----------------------------------------------------------------------

  private applyToggles(): void {
    if (this.floorGroup) this.floorGroup.visible = this.toggles.grid;
    if (this.projectionGroup) this.projectionGroup.visible = this.toggles.projections;
    if (this.petalMesh) this.petalMesh.visible = this.toggles.petal;
    if (this.petalBorder) this.petalBorder.visible = this.toggles.petal;
  }

  /**
   * Shift the projection frustum so content appears right of the left drawer.
   * Uses setViewOffset — camera / OrbitControls stay untouched (no jitter).
   */
  private applyDrawerViewOffset(): void {
    // Negative offsetX moves scene right on screen (drawer eats left side).
    // Always use setViewOffset (even at 0) so the projection path stays consistent.
    this.camera.setViewOffset(
      this.width,
      this.height,
      -this.drawerShiftPx,
      0,
      this.width,
      this.height,
    );
  }

  // -----------------------------------------------------------------------
  // Internal: Render loop
  // -----------------------------------------------------------------------

  private animate(): void {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);

    // Auto-rotate
    if (this.toggles.autoRotate) {
      const t = Date.now() * 0.0005;
      this.camera.position.x = Math.sin(t) * 11;
      this.camera.position.z = Math.cos(t) * 11;
      this.camera.lookAt(0, 1.5, 0);
      this.needsRender = true;
    }

    const controlsChanged = this.controls.update();

    if (!this.needsRender && !controlsChanged && !this.toggles.autoRotate) return;

    this.applyDrawerViewOffset();

    this.renderer.render(this.scene, this.camera);

    // Project 2D labels
    if (this.onLabelsUpdate) {
      const wh = this.width / 2;
      const hh = this.height / 2;

      const oVec = new THREE.Vector3(0, 0, 0).project(this.camera);
      const tVec = this.targetMesh
        ? new THREE.Vector3(this.curCartesian.x, this.curCartesian.y, this.curCartesian.z).project(
            this.camera,
          )
        : oVec.clone();

      const vectorCoords = this.vectors.map((v) => {
        const { vx, vy, vz } = this.toCartesian(v);
        const pVec = new THREE.Vector3(vx, vy, vz).project(this.camera);
        return {
          fromKey: v.fromKey,
          x: pVec.x * wh + wh,
          y: -pVec.y * hh + hh,
          visible: pVec.z <= 1,
        };
      });

      this.onLabelsUpdate({
        originX: oVec.x * wh + wh,
        originY: -(oVec.y * hh) + hh,
        originVisible: oVec.z <= 1,
        targetX: tVec.x * wh + wh,
        targetY: -(tVec.y * hh) + hh,
        targetVisible: tVec.z <= 1,
        vectorCoords,
      });
    }

    this.needsRender = false;
  }
}
