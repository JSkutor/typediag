import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Delaunay } from "d3-delaunay";
import { KeyResult } from "@/lib/skdm";
import gsap from "gsap";

import {
  IS_SURFACE_KEY,
  SURFACE_GAP,
  SURFACE_SCALE,
  SURFACE_Y_OFFSET,
  CYL_COLORS,
  generateSurfaceLayout,
  calculateSurfaceBorders,
} from "./geometryUtils";
import {
  LATENCY_POWER,
  TARGET_ELEVATION_SCALE,
  buildInnerBorderLinePoints,
  buildMergedDropLines,
  computeZRange,
  getRelativeZ,
  subdivideSurfaceMesh,
  surfaceVertexColor,
  SURFACE_BORDER_COLOR,
} from "./surfaceGeometry";

export { LATENCY_POWER, TARGET_ELEVATION_SCALE };

const { layoutMap: KEY_LAYOUT, centerX, centerZ } = generateSurfaceLayout();
const { innerBorderPoints: _innerBorderPoints, outerBorderPoints: _outerBorderPoints } =
  calculateSurfaceBorders(KEY_LAYOUT);

export interface SurfaceLabelProjection {
  key: string;
  x: number;
  y: number;
  visible: boolean;
}

export class Surface3DManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private floorGroup = new THREE.Group();
  private surfaceGroup: THREE.Group = new THREE.Group();
  private surfaceKeys: KeyResult[] = [];
  private innerBorderPoints: Array<[number, number]> = [];
  private outerBorderPoints: Array<[number, number]> = [];
  private minZ: number = 0;
  private maxZ: number = 1;
  private zRange: number = 1;

  private reqId: number = 0;
  private needsRender: boolean = true;

  private width: number;
  private height: number;
  private dist: number;

  public animState = {
    elevationScale: 0,
    camX: 0,
    camY: 0,
    camZ: 0.1,
    opacity: 0,
    fov: 45,
  };

  private _isLanding: boolean = false;

  public get isLanding(): boolean {
    return this._isLanding;
  }

  public set isLanding(val: boolean) {
    this._isLanding = val;
    if (this.renderer) {
      const maxRatio = val ? 1.5 : 2.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));
    }
  }

  private timeline: gsap.core.Timeline | null = null;
  private isActivated: boolean = false;
  private isDisposed: boolean = false;

  public onLabelsUpdate?: (
    labels: SurfaceLabelProjection[],
    opacity: number,
    anchorX: number,
    anchorY: number,
  ) => void;

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CYL_COLORS.sceneBg);
    this.scene.fog = new THREE.FogExp2(CYL_COLORS.sceneBg, 0.001);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);

    const fovRad = (45 * Math.PI) / 180;
    this.dist = height / (2 * Math.tan(fovRad / 2));
    this.camera.position.set(0, this.dist, 0.1);

    this.animState.camX = 0;
    this.animState.camY = this.dist;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      precision: "highp",
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x1a1d24, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(150, 300, 100);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0x4dc6e8, 0.6);
    directionalLight2.position.set(-150, 200, -100);
    this.scene.add(directionalLight2);

    const gridHelper = new THREE.GridHelper(1000, 20, 0x323640, 0x262930);
    gridHelper.position.y = -10;
    gridHelper.renderOrder = -2;
    this.floorGroup.add(gridHelper);
    this.floorGroup.renderOrder = -2;
    this.scene.add(this.floorGroup);

    this.innerBorderPoints = _innerBorderPoints;
    this.outerBorderPoints = _outerBorderPoints;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 1.2;
    this.controls.zoomSpeed = 1.2;
    this.controls.enablePan = false;
    this.controls.panSpeed = 1.2;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    this.controls.addEventListener("change", () => {
      this.needsRender = true;
    });

    this.scene.add(this.surfaceGroup);
    this.surfaceGroup.position.y = SURFACE_Y_OFFSET;

    this.renderLoop = this.renderLoop.bind(this);
    this.reqId = requestAnimationFrame(this.renderLoop);
  }

  public lockControls(): void {
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
  }

  private disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.LineSegments
      ) {
        child.geometry?.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  private clearSurfaceGroup(): void {
    while (this.surfaceGroup.children.length > 0) {
      const child = this.surfaceGroup.children[0];
      this.surfaceGroup.remove(child);
      this.disposeObject3D(child);
    }
  }

  public updateData(keyStats: Record<string, KeyResult>) {
    const keyArray = Object.values(keyStats);
    this.surfaceKeys = keyArray.filter((k) => IS_SURFACE_KEY(k.key));
    if (this.surfaceKeys.length === 0) return;

    const range = computeZRange(this.surfaceKeys);
    this.minZ = range.minZ;
    this.maxZ = range.maxZ;
    this.zRange = range.zRange;

    this.clearSurfaceGroup();

    const N = this.surfaceKeys.length;
    const M1 = this.innerBorderPoints.length;
    const M2 = this.outerBorderPoints.length;
    const totalVertices = N + M1 + M2;

    const positions = new Float32Array(totalVertices * 3);
    const colors = new Float32Array(totalVertices * 3);

    const maxConfidence =
      this.surfaceKeys.length > 0 ? Math.max(...this.surfaceKeys.map((k) => k.confidence), 1) : 1;

    const boundaryColor = new THREE.Color().setHSL(227 / 360, 0.35, 0.28);
    const topPositions = new Map<string, THREE.Vector3>();

    this.surfaceKeys.forEach((k, i) => {
      const pos = this.get3DPos(k, TARGET_ELEVATION_SCALE);
      topPositions.set(k.key.toLowerCase(), pos.clone());
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const { relativeZ } = getRelativeZ(k, this.minZ, this.zRange);
      const normConf = maxConfidence > 0 ? Math.sqrt(k.confidence / maxConfidence) : 0;
      const col = surfaceVertexColor(relativeZ, normConf);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    });

    this.innerBorderPoints.forEach((bp, i) => {
      const idx = (N + i) * 3;
      positions[idx] = bp[0];
      positions[idx + 1] = 0;
      positions[idx + 2] = bp[1];
      colors[idx] = boundaryColor.r;
      colors[idx + 1] = boundaryColor.g;
      colors[idx + 2] = boundaryColor.b;
    });

    this.outerBorderPoints.forEach((bp, i) => {
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
      this.surfaceKeys.forEach((k) => {
        const layout = KEY_LAYOUT[k.key.toLowerCase()];
        if (layout) {
          points.push([layout.x, layout.z]);
        } else {
          const x = (k.x - centerX) * SURFACE_SCALE;
          const z = ((2.0 - k.y) * (1 + SURFACE_GAP) - centerZ) * SURFACE_SCALE;
          points.push([x, z]);
        }
      });
      this.innerBorderPoints.forEach((bp) => points.push([bp[0], bp[1]]));
      this.outerBorderPoints.forEach((bp) => points.push([bp[0], bp[1]]));
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

    const surfaceOpacity = this.isLanding ? 0.60 : 0.42;
    const surfaceMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: surfaceOpacity,
      side: THREE.FrontSide,
      shininess: 20,
      specular: new THREE.Color(0x4dc6e8),
      emissive: new THREE.Color(0x122e3f),
      flatShading: false,
      depthWrite: true,
    });
    surfaceMaterial.userData = { baseOpacity: surfaceOpacity };

    const mesh = new THREE.Mesh(geometry, surfaceMaterial);
    mesh.renderOrder = 1;
    this.surfaceGroup.add(mesh);

    // Holographic wireframe grid overlay
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
    this.surfaceGroup.add(wireframeMesh);

    const borderPoints = buildInnerBorderLinePoints(this.innerBorderPoints);
    if (borderPoints.length > 1) {
      const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
      const borderMat = new THREE.LineBasicMaterial({
        color: SURFACE_BORDER_COLOR,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      borderMat.userData = { baseOpacity: 0.55 };
      const borderLine = new THREE.Line(borderGeom, borderMat);
      borderLine.renderOrder = 1;
      this.surfaceGroup.add(borderLine);
    }

    const dropLines = buildMergedDropLines(
      this.surfaceKeys,
      topPositions,
      this.minZ,
      this.zRange,
      maxConfidence,
    );
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
      const dropMesh = new THREE.LineSegments(dropGeom, dropMat);
      dropMesh.renderOrder = 0;
      this.surfaceGroup.add(dropMesh);
    }

    this.applyAnimState(false);
  }

  public getSurfaceKeys(): KeyResult[] {
    return this.surfaceKeys;
  }

  public get3DPos(k: KeyResult, elevationScale: number) {
    const keyName = k.key.toLowerCase();
    const layout = KEY_LAYOUT[keyName];

    const { amplifiedZ } = getRelativeZ(k, this.minZ, this.zRange);
    const isDummy = keyName === "_dummy_comma";
    const keyElevation = isDummy ? 0 : (0.15 + amplifiedZ) * elevationScale;

    if (layout) {
      return new THREE.Vector3(layout.x, keyElevation, layout.z);
    }

    const x = (k.x - centerX) * SURFACE_SCALE;
    const z = ((2.0 - k.y) * (1 + SURFACE_GAP) - centerZ) * SURFACE_SCALE;
    return new THREE.Vector3(x, keyElevation, z);
  }

  public getLabelWorldPos(k: KeyResult, elevationScale: number): THREE.Vector3 {
    const local = this.get3DPos(k, TARGET_ELEVATION_SCALE);
    const scaleY = elevationScale / TARGET_ELEVATION_SCALE;
    return new THREE.Vector3(local.x, SURFACE_Y_OFFSET + local.y * scaleY, local.z);
  }

  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.needsRender = true;
  }

  public setActivated(activated: boolean) {
    if (this.isActivated === activated) return;
    this.isActivated = activated;

    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }

    if (activated) {
      this.animState.elevationScale = 0;
      this.animState.opacity = 0;

      if (this.isLanding) {
        this.animState.camX = 600;
        this.animState.camY = 150;
        this.animState.camZ = -600;
        this.animState.fov = 60;
      } else {
        this.animState.camX = 0;
        this.animState.camY = 250;
        this.animState.camZ = -500;
        this.animState.fov = 60;
      }

      this.applyAnimState(true);
      this.controls.enabled = false;

      requestAnimationFrame(() => {
        if (this.isDisposed || !this.isActivated) return;

        if (this.timeline) {
          this.timeline.kill();
        }

        this.timeline = gsap.timeline({
          onUpdate: () => this.applyAnimState(true),
          onComplete: () => {
            this.controls.enabled = !this.isLanding;
            this.controls.update();
          },
        });

        let targetCamX = 0;
        let targetCamY = 480;
        let targetCamZ = 480;
        let duration = 0.8;

        if (this.isLanding) {
          targetCamX = 400;
          targetCamY = 350;
          targetCamZ = 400;
          duration = 1.2;
        }

        this.timeline.to(
          this.animState,
          {
            camX: targetCamX,
            camY: targetCamY,
            camZ: targetCamZ,
            fov: 45,
            duration,
            ease: "power2.out",
          },
          0,
        );

        this.timeline.to(
          this.animState,
          {
            elevationScale: TARGET_ELEVATION_SCALE,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(1.2)",
          },
          0.15,
        );

        this.timeline.add(() => {
          this.controls.target.set(0, 0, 0);
        });
      });
    } else {
      this.animState.elevationScale = 0;
      this.animState.camX = 0;
      this.animState.camY = this.dist;
      this.animState.camZ = 0.1;
      this.animState.opacity = 0;
      this.animState.fov = 45;
      this.applyAnimState(true);
    }
  }

  private applyAnimState(updateCamera = true) {
    if (updateCamera) {
      this.camera.position.set(this.animState.camX, this.animState.camY, this.animState.camZ);
      this.camera.fov = this.animState.fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(0, 0, 0);
    }

    if (this.surfaceGroup) {
      const scaleY = this.animState.elevationScale / TARGET_ELEVATION_SCALE;
      this.surfaceGroup.scale.set(1, scaleY, 1);

      this.surfaceGroup.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.Line ||
          child instanceof THREE.LineSegments
        ) {
          const mat = child.material;
          if (!mat) return;
          const materials = Array.isArray(mat) ? mat : [mat];
          for (const m of materials) {
            m.transparent = true;
            m.opacity = this.animState.opacity * (m.userData.baseOpacity ?? 0.62);
          }
        }
      });
    }

    this.needsRender = true;
  }

  private projectLabels(): SurfaceLabelProjection[] {
    const wh = this.width / 2;
    const hh = this.height / 2;
    const labels: SurfaceLabelProjection[] = [];

    for (const k of this.surfaceKeys) {
      if (k.key.toLowerCase() === "_dummy_comma") continue;

      const world = this.getLabelWorldPos(k, this.animState.elevationScale);
      const projected = world.project(this.camera);
      labels.push({
        key: k.key,
        x: projected.x * wh + wh,
        y: -projected.y * hh + hh,
        visible: projected.z <= 1,
      });
    }

    return labels;
  }

  private renderLoop() {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.renderLoop);

    const timelineActive = this.timeline?.isActive() ?? false;
    const controlsActive = this.isActivated && !timelineActive && this.controls.enabled;
    const controlsChanged = controlsActive ? this.controls.update() : false;

    if (timelineActive || controlsChanged) {
      this.needsRender = true;
    }

    if (!this.needsRender) return;

    this.renderer.render(this.scene, this.camera);

    if (this.onLabelsUpdate) {
      const wh = this.width / 2;
      const hh = this.height / 2;
      const anchor = new THREE.Vector3(0, SURFACE_Y_OFFSET, 0).project(this.camera);
      this.onLabelsUpdate(
        this.projectLabels(),
        this.animState.opacity,
        anchor.x * wh + wh,
        -anchor.y * hh + hh,
      );
    }

    this.needsRender = false;
  }

  public dispose() {
    this.isDisposed = true;
    this.onLabelsUpdate = undefined;
    cancelAnimationFrame(this.reqId);
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    this.clearSurfaceGroup();
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
