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
import { CYL_COLORS as C, toCylindricalCartesian } from "./geometryUtils";

// ---------------------------------------------------------------------------
// Constants moved to geometryUtils.ts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CylindricalToggles {
  cylinder: boolean;
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
  private gridHelper: THREE.GridHelper;
  private pointLight: THREE.PointLight;

  // Toggle-controlled mesh references
  private cylinderGuide: THREE.Object3D | null = null;
  private cylinderTopRing: THREE.LineSegments | THREE.Mesh | null = null;
  private cylinderBottomRing: THREE.Mesh | null = null;
  private projectionGroup: THREE.Group | null = null;
  private petalMesh: THREE.Mesh | null = null;
  private petalBorder: THREE.Line | null = null;

  // Target mesh for label projection
  private targetMesh: THREE.Mesh | null = null;
  private curCartesian: CartesianCoords = { x: 0, y: 0, z: 0 };
  private vectors: CylindricalVector[] = [];

  private reqId = 0;
  private needsRender = true;
  private width: number;
  private height: number;
  private toggles: CylindricalToggles = {
    cylinder: true,
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
    this.scene.fog = new THREE.FogExp2(C.sceneBg, 0.012);

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
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 1.2;
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
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 15, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    this.pointLight = new THREE.PointLight(C.targetNode, 1.5, 15);
    this.scene.add(this.pointLight);

    // Grid
    this.gridHelper = new THREE.GridHelper(24, 24, C.gridMain, C.gridSub);
    this.scene.add(this.gridHelper);

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
    this.vectors = vectors;
    this.clearVisualGroup();
    if (vectors.length === 0) return;

    // 0. Petal surface (needs ≥ 3 vectors)
    this.buildPetalSurface(vectors);

    // 1. Inactive vectors (all except selected)
    for (const v of vectors) {
      if (v.fromKey === selectedFrom) continue;
      this.addInactiveVector(v);
    }

    // 2. Active vector
    const active = vectors.find((v) => v.fromKey === selectedFrom);
    if (active) {
      this.buildActiveVector(active);
    }

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
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.needsRender = true;
  }

  /** Tear down everything. */
  public dispose(): void {
    this.isDisposed = true;
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
      this.visualGroup.remove(this.visualGroup.children[0]);
    }
    this.cylinderGuide = null;
    this.cylinderTopRing = null;
    this.cylinderBottomRing = null;
    this.projectionGroup = null;
    this.petalMesh = null;
    this.petalBorder = null;
    this.targetMesh = null;
  }

  /** Draw a dim line + small sphere for a non-selected vector. (Removed by user request) */
  private addInactiveVector(v: CylindricalVector): void {
    // Left empty to only show petal
  }

  /** Build the fully highlighted active vector with all helpers. */
  private buildActiveVector(v: CylindricalVector): void {
    const { vx, vy, vz } = this.toCartesian(v);
    this.curCartesian = { x: vx, y: vy, z: vz };

    // Point light follows the target
    this.pointLight.position.set(vx, vy, vz);
    this.pointLight.color.setHex(C.targetNode);

    const thetaRad = v.theta;
    const cylRadius = Math.sqrt(vx * vx + vz * vz);

    // Target mesh is needed for labels, but make it invisible
    const tGeom = new THREE.SphereGeometry(0.01, 8, 8);
    const tMat = new THREE.MeshBasicMaterial({ visible: false });
    this.targetMesh = new THREE.Mesh(tGeom, tMat);
    this.targetMesh.position.set(vx, vy, vz);
    this.visualGroup.add(this.targetMesh);

    // [4] Cylinder guide hologram (Alpha Gradient + Floating Dashed Rings)
    if (cylRadius > 0.05 && vy > 0.05) {
      const cylGroup = new THREE.Group();

      // 1. Alpha Gradient Light Pillar
      const cylSolidGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, vy, 32, 1, true);
      const colorObj = new THREE.Color(C.cylinder);
      const cylSolidMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: colorObj },
          uHeight: { value: vy },
        },
        vertexShader: `
          varying float vY;
          void main() {
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uHeight;
          varying float vY;
          void main() {
            float normalizedY = (vY + uHeight * 0.5) / uHeight;
            float alpha = smoothstep(1.0, 0.0, normalizedY) * 0.25;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const cylSolid = new THREE.Mesh(cylSolidGeom, cylSolidMat);
      cylGroup.add(cylSolid);

      // 2. Glowing Bottom Ring (Solid)
      const ringGeom = new THREE.RingGeometry(cylRadius - 0.015, cylRadius + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: C.cylinder,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.cylinderBottomRing = new THREE.Mesh(ringGeom, ringMat);
      this.cylinderBottomRing.rotation.x = Math.PI / 2;
      this.cylinderBottomRing.position.y = -vy / 2;
      cylGroup.add(this.cylinderBottomRing);

      // 3. Middle Floating Dashed Ring
      const edgeGeom = new THREE.EdgesGeometry(new THREE.CircleGeometry(cylRadius, 64));
      const dashMat = new THREE.LineDashedMaterial({
        color: C.cylinder,
        transparent: true,
        opacity: 0.35,
        dashSize: 0.15,
        gapSize: 0.1,
        blending: THREE.AdditiveBlending,
      });
      const middleRing = new THREE.LineSegments(edgeGeom, dashMat);
      middleRing.computeLineDistances();
      middleRing.rotation.x = Math.PI / 2;
      middleRing.position.y = 0;
      cylGroup.add(middleRing);

      // 4. Top Floating Dashed Ring
      const topRing = middleRing.clone();
      topRing.position.y = vy / 2;
      cylGroup.add(topRing);
      this.cylinderTopRing = topRing;

      this.cylinderGuide = cylGroup;
      this.cylinderGuide.position.set(0, vy / 2, 0);
      this.visualGroup.add(this.cylinderGuide);
    }

    // [5] Projections group
    this.projectionGroup = new THREE.Group();

    // (B) Radius guide line
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

    this.visualGroup.add(this.projectionGroup);
  }

  /** Build petal surface connecting all vector endpoints through origin. */
  private buildPetalSurface(vectors: CylindricalVector[]): void {
    if (vectors.length < 3) return;

    const sorted = [...vectors].sort((a, b) => a.theta - b.theta);
    const vertices: number[] = [];
    const colors: number[] = [];

    // Origin vertex
    vertices.push(0, 0, 0);
    const originColor = new THREE.Color(C.originNode);
    colors.push(originColor.r, originColor.g, originColor.b);

    // Endpoint vertices
    for (const v of sorted) {
      const { vx, vy, vz } = this.toCartesian(v);
      vertices.push(vx, vy, vz);

      // Gradient: cyan (100ms) → amber (800ms)
      const t = Math.min(1, Math.max(0, (v.z - 100) / 700));
      colors.push(0.02 + t * 0.96, 0.71 + t * 0.04, 0.83 - t * 0.69);
    }

    // Fan triangles
    const N = sorted.length;
    const indices: number[] = [];
    for (let i = 1; i <= N; i++) {
      const next = i === N ? 1 : i + 1;
      indices.push(0, i, next);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.1,
      depthWrite: false,
    });

    this.petalMesh = new THREE.Mesh(geom, mat);
    this.petalMesh.castShadow = true;
    this.petalMesh.receiveShadow = true;
    this.visualGroup.add(this.petalMesh);

    // Border line
    const borderPts = sorted.map((v) => {
      const c = this.toCartesian(v);
      return new THREE.Vector3(c.vx, c.vy, c.vz);
    });
    if (borderPts.length > 0) borderPts.push(borderPts[0].clone());

    const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPts);
    const borderMat = new THREE.LineBasicMaterial({
      color: C.petalBorder,
      transparent: true,
      opacity: 0.75,
    });
    this.petalBorder = new THREE.Line(borderGeom, borderMat);
    this.visualGroup.add(this.petalBorder);
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

  /** Floor-plane angle arc with translucent fill. */
  private createAngleArc(radius: number, thetaRad: number, color: number): THREE.Group {
    const arcGroup = new THREE.Group();
    if (thetaRad <= 0.01) return arcGroup;

    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, thetaRad, false, 0);

    const pts2D = curve.getPoints(Math.max(10, Math.floor(thetaRad * 30)));
    const pts3D = pts2D.map((p) => new THREE.Vector3(p.x, 0, p.y));

    const lineGeom = new THREE.BufferGeometry().setFromPoints(pts3D);
    const lineMat = new THREE.LineBasicMaterial({ color });
    arcGroup.add(new THREE.Line(lineGeom, lineMat));

    // Translucent fill
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    pts2D.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(0, 0);

    const fillGeom = new THREE.ShapeGeometry(shape);
    const fillMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const fill = new THREE.Mesh(fillGeom, fillMat);
    fill.rotation.x = Math.PI / 2;
    arcGroup.add(fill);

    return arcGroup;
  }

  // -----------------------------------------------------------------------
  // Internal: Toggle visibility
  // -----------------------------------------------------------------------

  private applyToggles(): void {
    if (this.cylinderGuide) this.cylinderGuide.visible = this.toggles.cylinder;
    if (this.cylinderTopRing) this.cylinderTopRing.visible = this.toggles.cylinder;
    if (this.cylinderBottomRing) this.cylinderBottomRing.visible = this.toggles.cylinder;
    if (this.gridHelper) this.gridHelper.visible = this.toggles.grid;
    if (this.projectionGroup) this.projectionGroup.visible = this.toggles.projections;
    if (this.petalMesh) this.petalMesh.visible = this.toggles.petal;
    if (this.petalBorder) this.petalBorder.visible = this.toggles.petal;
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

    this.controls.update();

    if (!this.needsRender) return;

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
