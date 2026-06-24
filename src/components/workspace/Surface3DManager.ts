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
  generateSurfaceLayout,
  calculateSurfaceBorders,
} from "./geometryUtils";

const { layoutMap: KEY_LAYOUT, centerX, centerZ } = generateSurfaceLayout();
const { innerBorderPoints: _innerBorderPoints, outerBorderPoints: _outerBorderPoints } =
  calculateSurfaceBorders(KEY_LAYOUT);

export const LATENCY_POWER = 1.3;

export class Surface3DManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private surfaceGroup: THREE.Group = new THREE.Group();
  private geometry: THREE.BufferGeometry;
  private dropLineGeometries: THREE.BufferGeometry[] = [];
  private positions: Float32Array = new Float32Array();
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

  // Animation state
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

  // Callback for updating HUD labels
  public onUpdateHUD?: (
    surfaceKeys: KeyResult[],
    elevationScale: number,
    camera: THREE.Camera,
    opacity: number,
    width: number,
    height: number,
  ) => void;

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e2024);
    this.scene.fog = new THREE.FogExp2(0x1e2024, 0.001);

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
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4dc6e8, 2.5);
    directionalLight.position.set(100, 200, 50);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight2.position.set(-100, 150, -50);
    this.scene.add(directionalLight2);

    const gridHelper = new THREE.GridHelper(1000, 40, 0x323640, 0x262930);
    gridHelper.position.y = -10;
    this.scene.add(gridHelper);

    this.geometry = new THREE.BufferGeometry();
    this.innerBorderPoints = _innerBorderPoints;
    this.outerBorderPoints = _outerBorderPoints;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 1.2;
    this.controls.zoomSpeed = 1.2;
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

  /** Disable all user interactions (rotation, zoom, pan). Used on landing page. */
  public lockControls(): void {
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
  }

  public updateData(keyStats: Record<string, KeyResult>) {
    const keyArray = Object.values(keyStats);
    this.surfaceKeys = keyArray.filter((k) => IS_SURFACE_KEY(k.key));
    if (this.surfaceKeys.length === 0) return;

    // Compute dynamic range (excluding dummy key)
    const activeKeysForRange = this.surfaceKeys.filter(
      (k) => k.key.toLowerCase() !== "_dummy_comma",
    );
    const zValues = activeKeysForRange.map((k) => k.zSmoothed);
    this.minZ = zValues.length > 0 ? Math.min(...zValues) : 0;
    this.maxZ = zValues.length > 0 ? Math.max(...zValues) : 1;
    this.zRange = this.maxZ - this.minZ;

    const N = this.surfaceKeys.length;
    const M1 = this.innerBorderPoints.length;
    const M2 = this.outerBorderPoints.length;
    const totalVertices = N + M1 + M2;

    this.positions = new Float32Array(totalVertices * 3);
    const colors = new Float32Array(totalVertices * 3);

    // Clear previous meshes inside the group
    this.surfaceGroup.clear();
    this.scene.children = this.scene.children.filter(
      (c) => c instanceof THREE.Light || c instanceof THREE.GridHelper || c === this.surfaceGroup,
    );

    this.dropLineGeometries = [];

    const tempColor = new THREE.Color();
    const maxConfidence =
      this.surfaceKeys.length > 0 ? Math.max(...this.surfaceKeys.map((k) => k.confidence), 1) : 1;

    // Define a neutral, slightly faded blue base for boundaries
    const boundaryColor = new THREE.Color().setHSL(227 / 360, 0.4, 0.3);

    const TARGET_ELEVATION_SCALE = 180;

    // Recreate geometry and materials
    // 1. Fill active key positions and colors (build at full target elevation)
    this.surfaceKeys.forEach((k, i) => {
      const pos = this.get3DPos(k, TARGET_ELEVATION_SCALE);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      const isDummy = k.key.toLowerCase() === "_dummy_comma";
      const relativeZ = isDummy
        ? 0
        : this.zRange > 0
          ? (k.zSmoothed - this.minZ) / this.zRange
          : 0.5;
      const amplifiedZ = Math.pow(relativeZ, LATENCY_POWER);
      const normConf = maxConfidence > 0 ? Math.sqrt(k.confidence / maxConfidence) : 0;

      // Hue: 227 (Blue) -> 345 (Magenta/Red)
      const hueStart = 227 / 360;
      const hueEnd = 345 / 360;
      const h = hueStart + (hueEnd - hueStart) * amplifiedZ;

      // Saturation: High confidence = 1.0 (vibrant), Low confidence = 0.2 (faded)
      const s = 0.2 + 0.8 * normConf;

      // Lightness: High confidence = 0.6 (bright), Low confidence = 0.25 (dark)
      const l = 0.25 + 0.35 * normConf;

      tempColor.setHSL(h, s, l);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    });

    // 2. Fill inner boundary positions and colors (always y = 0, neutral color)
    this.innerBorderPoints.forEach((bp, i) => {
      const idx = (N + i) * 3;
      this.positions[idx] = bp[0];
      this.positions[idx + 1] = 0;
      this.positions[idx + 2] = bp[1];

      colors[idx] = boundaryColor.r;
      colors[idx + 1] = boundaryColor.g;
      colors[idx + 2] = boundaryColor.b;
    });

    // 3. Fill outer boundary positions and colors (always y = 0, neutral color)
    this.outerBorderPoints.forEach((bp, i) => {
      const idx = (N + M1 + i) * 3;
      this.positions[idx] = bp[0];
      this.positions[idx + 1] = 0;
      this.positions[idx + 2] = bp[1];

      colors[idx] = boundaryColor.r;
      colors[idx + 1] = boundaryColor.g;
      colors[idx + 2] = boundaryColor.b;
    });

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    if (N >= 3) {
      const points: Array<[number, number]> = [];
      // Add active keys
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
      // Add inner boundary points
      this.innerBorderPoints.forEach((bp) => {
        points.push([bp[0], bp[1]]);
      });
      // Add outer boundary points
      this.outerBorderPoints.forEach((bp) => {
        points.push([bp[0], bp[1]]);
      });

      const delaunay = Delaunay.from(points);
      this.geometry.setIndex(Array.from(delaunay.triangles));
      this.geometry.computeVertexNormals();
    }

    // Material Selection: lightweight StandardMaterial for landing, PhysicalMaterial for workspace
    const surfaceMaterial = this.isLanding
      ? new THREE.MeshStandardMaterial({
          vertexColors: true,
          metalness: 0.2,
          roughness: 0.4,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          metalness: 0.1,
          roughness: 0.2,
          transmission: 0.6,
          thickness: 1.5,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          clearcoat: 0.5,
          clearcoatRoughness: 0.1,
        });
    surfaceMaterial.userData = { baseOpacity: 0.85 };

    const mesh = new THREE.Mesh(this.geometry, surfaceMaterial);
    this.surfaceGroup.add(mesh);

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x6dd4f0,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    wireframeMaterial.userData = { baseOpacity: 0.4 };

    const wireframeMesh = new THREE.Mesh(this.geometry, wireframeMaterial);
    wireframeMesh.position.y += 0.1;
    this.surfaceGroup.add(wireframeMesh);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
    });
    lineMaterial.userData = { baseOpacity: 0.5 };

    const keycapMaterial = new THREE.MeshStandardMaterial({
      color: 0x323640,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.surfaceKeys.forEach((k) => {
      const pTop = this.get3DPos(k, TARGET_ELEVATION_SCALE);
      const pBase = new THREE.Vector3(pTop.x, 0, pTop.z);
      const lineGeom = new THREE.BufferGeometry().setFromPoints([pTop, pBase]);

      // Calculate key-specific HSL color to match the node
      const isDummy = k.key.toLowerCase() === "_dummy_comma";
      const relativeZ = isDummy
        ? 0
        : this.zRange > 0
          ? (k.zSmoothed - this.minZ) / this.zRange
          : 0.5;
      const amplifiedZ = Math.pow(relativeZ, LATENCY_POWER);
      const normConf = maxConfidence > 0 ? Math.sqrt(k.confidence / maxConfidence) : 0;

      const hueStart = 227 / 360;
      const hueEnd = 345 / 360;
      const h = hueStart + (hueEnd - hueStart) * amplifiedZ;
      const s = 0.2 + 0.8 * normConf;
      const l = 0.25 + 0.35 * normConf;

      const col = new THREE.Color().setHSL(h, s, l);
      const lineColors = new Float32Array([
        col.r,
        col.g,
        col.b, // top point
        col.r,
        col.g,
        col.b, // bottom point
      ]);
      lineGeom.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

      const line = new THREE.Line(lineGeom, lineMaterial);
      if (k.key !== "_dummy_comma") {
        this.surfaceGroup.add(line);
      }
      this.dropLineGeometries.push(lineGeom);
    });

    this.surfaceKeys.forEach((k) => {
      if (k.key === "_dummy_comma") return;
      const layout = KEY_LAYOUT[k.key.toLowerCase()];
      if (!layout) return;

      const boxW = layout.w - SURFACE_GAP * SURFACE_SCALE;
      const boxD = layout.h - SURFACE_GAP * SURFACE_SCALE;
      const boxGeom = new THREE.BoxGeometry(boxW, 10, boxD);
      const boxMesh = new THREE.Mesh(boxGeom, keycapMaterial);
      // y=0 is the top of the keycaps (base level), so center y at -5
      boxMesh.position.set(layout.x, -5, layout.z);
      this.scene.add(boxMesh);
    });

    // Apply current animState to geometry
    this.applyAnimState(false);
  }

  public getSurfaceKeys(): KeyResult[] {
    return this.surfaceKeys;
  }

  public get3DPos(k: KeyResult, elevationScale: number) {
    const keyName = k.key.toLowerCase();
    const layout = KEY_LAYOUT[keyName];

    const isDummy = keyName === "_dummy_comma";
    const relativeZ = isDummy ? 0 : this.zRange > 0 ? (k.zSmoothed - this.minZ) / this.zRange : 0.5;
    const amplifiedZ = Math.pow(relativeZ, LATENCY_POWER);
    const keyElevation = isDummy ? 0 : (0.15 + amplifiedZ) * elevationScale;

    if (layout) {
      return new THREE.Vector3(layout.x, keyElevation, layout.z);
    }

    // Fallback: apply same transformation as KEY_LAYOUT
    const x = (k.x - centerX) * SURFACE_SCALE;
    const z = ((2.0 - k.y) * (1 + SURFACE_GAP) - centerZ) * SURFACE_SCALE;
    return new THREE.Vector3(x, keyElevation, z);
  }

  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public setActivated(activated: boolean) {
    if (this.isActivated === activated) return;
    this.isActivated = activated;

    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }

    if (activated) {
      // 1. Set warp close-up starting state
      this.animState.elevationScale = 0;
      this.animState.opacity = 0;

      if (this.isLanding) {
        // Option A: Dynamic cinematic angle - starting from side and back
        this.animState.camX = 600;
        this.animState.camY = 150;
        this.animState.camZ = -600;
        this.animState.fov = 60;
      } else {
        this.animState.camX = 0;
        this.animState.camY = 250; // Raised from 80 to prevent clipping
        this.animState.camZ = -500; // Pushed back from -350
        this.animState.fov = 60; // Moderated from 75 for comfortable perspective
      }

      this.applyAnimState(true);
      this.controls.enabled = false;

      // Defer transition by 1 frame to let Three.js load/render initial frames smoothly
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

        const TARGET_ELEVATION_SCALE = 180;

        let targetCamX = 0;
        let targetCamY = 480;
        let targetCamZ = 480;
        let duration = 0.8;

        if (this.isLanding) {
          // Option A Target: isometric perspective angle (x: 400, y: 350, z: 400), 1.2s smooth ease
          targetCamX = 400;
          targetCamY = 350;
          targetCamZ = 400;
          duration = 1.2;
        }

        // 2. Cinematic dive transition (0.8s or 1.2s) - smooth power2.out
        this.timeline.to(
          this.animState,
          {
            camX: targetCamX,
            camY: targetCamY,
            camZ: targetCamZ,
            fov: 45,
            duration: duration,
            ease: "power2.out",
          },
          0,
        );

        // 3. Elastic mesh rise (starts at 0.15s, finishes at 0.65s)
        this.timeline.to(
          this.animState,
          {
            elevationScale: TARGET_ELEVATION_SCALE,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(1.2)", // Gentler bounce
          },
          0.15,
        );

        this.timeline.add(() => {
          this.controls.target.set(0, 0, 0);
        });
      });
    } else {
      // Reset immediately
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
      const TARGET_ELEVATION_SCALE = 180;
      const scaleY = this.animState.elevationScale / TARGET_ELEVATION_SCALE;
      this.surfaceGroup.scale.set(1, scaleY, 1);

      // Traversal for smooth opacity transition based on baseOpacity in userData
      this.surfaceGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          const mat = child.material;
          if (mat) {
            if (Array.isArray(mat)) {
              mat.forEach((m) => {
                m.transparent = true;
                m.opacity = this.animState.opacity * (m.userData.baseOpacity ?? 0.85);
              });
            } else {
              mat.transparent = true;
              mat.opacity = this.animState.opacity * (mat.userData.baseOpacity ?? 0.85);
            }
          }
        }
      });
    }

    this.needsRender = true;
  }

  private renderLoop() {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.renderLoop);

    // Only update orbit controls if entrance is done
    if (this.timeline && !this.timeline.isActive() && this.isActivated) {
      this.controls.update();
    }

    if (this.timeline && this.timeline.isActive()) {
      this.needsRender = true;
    }

    if (!this.needsRender) return;

    this.renderer.render(this.scene, this.camera);

    if (this.onUpdateHUD) {
      this.onUpdateHUD(
        this.surfaceKeys,
        this.animState.elevationScale,
        this.camera,
        this.animState.opacity,
        this.width,
        this.height,
      );
    }

    this.needsRender = false;
  }

  public dispose() {
    this.isDisposed = true;
    this.onUpdateHUD = undefined;
    cancelAnimationFrame(this.reqId);
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
