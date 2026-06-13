import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Delaunay } from "d3-delaunay";
import { KeyResult } from "@/lib/skdm";
import gsap from "gsap";
import { TRANSITION_TIMING } from "./flightChoreography";

import { buildLayout } from "@/lib/skdm/layout";

const IS_SURFACE_KEY = (key: string) => {
  const lower = key.toLowerCase();
  return /^[a-z]$/.test(lower) || lower === "," || lower === ".";
};

// --- Keyboard 3D Layout Definition ---
const KEY_LAYOUT: Record<string, { x: number; z: number; w: number; h: number }> = {};
const GAP = 0.1667; // matches 8px gap relative to 48px key width (3rem)
const SCALE = 70; // Map unit scale to match the desired size
const SURFACE_Y_OFFSET = 2.0; // Avoid z-fighting with 3D keycaps when elevation is 0

const rawLayout = buildLayout();

// Map raw 2D layout to 3D KEY_LAYOUT
for (const [keyName, pos] of Object.entries(rawLayout)) {
  const w = 1.0;
  const h = 1.0; // depth

  // 3D coordinate mapping:
  // x is the same
  // z represents the row depth. Since pos.y is larger for top rows, we invert it.
  // We use 2.0 (QWERTY row) as the reference z = 0.
  const z = (2.0 - pos.y) * (1 + GAP);
  
  KEY_LAYOUT[keyName] = {
    x: pos.x,
    z,
    w,
    h,
  };
}

// Calculate bounding box for center alignment
let rawMinX = Infinity;
let rawMaxX = -Infinity;
let rawMinZ = Infinity;
let rawMaxZ = -Infinity;

for (const k in KEY_LAYOUT) {
  const layout = KEY_LAYOUT[k];
  const halfW = layout.w / 2;
  const halfH = layout.h / 2;
  if (layout.x - halfW < rawMinX) rawMinX = layout.x - halfW;
  if (layout.x + halfW > rawMaxX) rawMaxX = layout.x + halfW;
  if (layout.z - halfH < rawMinZ) rawMinZ = layout.z - halfH;
  if (layout.z + halfH > rawMaxZ) rawMaxZ = layout.z + halfH;
}

const LAYOUT_WIDTH = rawMaxX - rawMinX;
const LAYOUT_DEPTH = rawMaxZ - rawMinZ;
const centerX = (rawMinX + rawMaxX) / 2;
const centerZ = (rawMinZ + rawMaxZ) / 2;

// Apply scale and centering offset
for (const k in KEY_LAYOUT) {
  KEY_LAYOUT[k].x = (KEY_LAYOUT[k].x - centerX) * SCALE;
  KEY_LAYOUT[k].z = (KEY_LAYOUT[k].z - centerZ) * SCALE;
  KEY_LAYOUT[k].w *= SCALE;
  KEY_LAYOUT[k].h *= SCALE;
}

export class Surface3DManager {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  private geometry: THREE.BufferGeometry;
  private dropLineGeometries: THREE.BufferGeometry[] = [];
  private positions: Float32Array = new Float32Array();
  private surfaceKeys: KeyResult[] = [];
  private innerBorderPoints: Array<[number, number]> = [];
  private outerBorderPoints: Array<[number, number]> = [];
  
  private reqId: number = 0;
  
  private width: number;
  private height: number;
  private dist: number;
  
  // Animation state
  public animState = {
    elevationScale: 0,
    camY: 0,
    camZ: 0.1,
    opacity: 0
  };
  
  private timeline: gsap.core.Timeline | null = null;
  private isActivated: boolean = false;
  
  // Callback for updating HUD labels
  public onUpdateHUD?: (surfaceKeys: KeyResult[], elevationScale: number, camera: THREE.Camera, opacity: number) => void;

  constructor(container: HTMLDivElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1b1e);
    this.scene.fog = new THREE.FogExp2(0x1a1b1e, 0.001);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    
    const fovRad = (45 * Math.PI) / 180;
    this.dist = height / (2 * Math.tan(fovRad / 2));
    this.camera.position.set(0, this.dist, 0.1);
    
    this.animState.camY = this.dist;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x3861fb, 2.5);
    directionalLight.position.set(100, 200, 50);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight2.position.set(-100, 150, -50);
    this.scene.add(directionalLight2);
    
    const gridHelper = new THREE.GridHelper(1000, 40, 0x3d3e42, 0x323336);
    gridHelper.position.y = -10;
    this.scene.add(gridHelper);
    
    this.geometry = new THREE.BufferGeometry();

    // 1. Calculate Inner Border Points along the actual staggered keyboard silhouette
    const q = KEY_LAYOUT["q"];
    const p = KEY_LAYOUT["p"];
    const l = KEY_LAYOUT["l"];
    const dot = KEY_LAYOUT["."];
    const z = KEY_LAYOUT["z"];
    const a = KEY_LAYOUT["a"];

    if (q && p && l && dot && z && a) {
      // Order of vertices around the alphanumeric key region to form a closed loop
      const vertices: Array<[number, number]> = [
        [q.x - q.w / 2, q.z - q.h / 2], // 1. QWERTY Top-Left
        [p.x + p.w / 2, p.z - p.h / 2], // 2. QWERTY Top-Right
        [p.x + p.w / 2, p.z + p.h / 2], // 3. QWERTY Bottom-Right (stagger transition start)
        [l.x + l.w / 2, l.z - l.h / 2], // 4. ASDF Top-Right (stagger transition end)
        [l.x + l.w / 2, l.z + l.h / 2], // 5. ASDF Bottom-Right (stagger transition start)
        [dot.x + dot.w / 2, dot.z - dot.h / 2], // 6. ZXCV Top-Right (stagger transition end)
        [dot.x + dot.w / 2, dot.z + dot.h / 2], // 7. ZXCV Bottom-Right
        [z.x - z.w / 2, z.z + z.h / 2], // 8. ZXCV Bottom-Left
        [z.x - z.w / 2, z.z - z.h / 2], // 9. ZXCV Top-Left (stagger transition end)
        [a.x - a.w / 2, a.z + a.h / 2], // 10. ASDF Bottom-Left (stagger transition start)
        [a.x - a.w / 2, a.z - a.h / 2], // 11. ASDF Top-Left (stagger transition end)
        [q.x - q.w / 2, q.z + q.h / 2], // 12. QWERTY Bottom-Left (stagger transition start)
      ];

      const innerPoints: Array<[number, number]> = [];
      const step = SCALE;

      for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];
        
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.max(1, Math.ceil(dist / step));
        
        for (let j = 0; j < steps; j++) {
          const t = j / steps;
          innerPoints.push([p1[0] + dx * t, p1[1] + dz * t]);
        }
      }
      this.innerBorderPoints = innerPoints;
    } else {
      // Fallback: calculate raw alphanumeric bounding box if keys are missing
      let innerMinX = Infinity;
      let innerMaxX = -Infinity;
      let innerMinZ = Infinity;
      let innerMaxZ = -Infinity;
      for (const k in KEY_LAYOUT) {
        if (!IS_SURFACE_KEY(k)) continue;
        const layout = KEY_LAYOUT[k];
        const halfW = layout.w / 2;
        const halfH = layout.h / 2;
        if (layout.x - halfW < innerMinX) innerMinX = layout.x - halfW;
        if (layout.x + halfW > innerMaxX) innerMaxX = layout.x + halfW;
        if (layout.z - halfH < innerMinZ) innerMinZ = layout.z - halfH;
        if (layout.z + halfH > innerMaxZ) innerMaxZ = layout.z + halfH;
      }
      
      const step = SCALE;
      const generateBoxPoints = (bMinX: number, bMaxX: number, bMinZ: number, bMaxZ: number) => {
        const points: Array<[number, number]> = [];
        const xSteps = Math.ceil((bMaxX - bMinX) / step);
        for (let i = 0; i <= xSteps; i++) {
          const t = i / xSteps;
          const x = bMinX + t * (bMaxX - bMinX);
          points.push([x, bMinZ]);
          points.push([x, bMaxZ]);
        }
        const zSteps = Math.ceil((bMaxZ - bMinZ) / step);
        for (let i = 1; i < zSteps; i++) {
          const t = i / zSteps;
          const z = bMinZ + t * (bMaxZ - bMinZ);
          points.push([bMinX, z]);
          points.push([bMaxX, z]);
        }
        return points;
      };
      this.innerBorderPoints = generateBoxPoints(innerMinX, innerMaxX, innerMinZ, innerMaxZ);
    }

    // 2. Calculate Outer Bounding Box for the entire keyboard layout (rectangular base)
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const k in KEY_LAYOUT) {
      const layout = KEY_LAYOUT[k];
      const halfW = layout.w / 2;
      const halfH = layout.h / 2;
      if (layout.x - halfW < minX) minX = layout.x - halfW;
      if (layout.x + halfW > maxX) maxX = layout.x + halfW;
      if (layout.z - halfH < minZ) minZ = layout.z - halfH;
      if (layout.z + halfH > maxZ) maxZ = layout.z + halfH;
    }

    // Add a small padding for the outer edge of the keyboard
    const PADDING = 0.5 * SCALE;
    const outerMinX = minX - PADDING;
    const outerMaxX = maxX + PADDING;
    const outerMinZ = minZ - PADDING;
    const outerMaxZ = maxZ + PADDING;

    const step = SCALE;
    const generateBoxPoints = (bMinX: number, bMaxX: number, bMinZ: number, bMaxZ: number) => {
      const points: Array<[number, number]> = [];
      const xSteps = Math.ceil((bMaxX - bMinX) / step);
      for (let i = 0; i <= xSteps; i++) {
        const t = i / xSteps;
        const x = bMinX + t * (bMaxX - bMinX);
        points.push([x, bMinZ]);
        points.push([x, bMaxZ]);
      }
      const zSteps = Math.ceil((bMaxZ - bMinZ) / step);
      for (let i = 1; i < zSteps; i++) {
        const t = i / zSteps;
        const z = bMinZ + t * (bMaxZ - bMinZ);
        points.push([bMinX, z]);
        points.push([bMaxX, z]);
      }
      return points;
    };

    this.outerBorderPoints = generateBoxPoints(outerMinX, outerMaxX, outerMinZ, outerMaxZ);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2;
    this.controls.rotateSpeed = 1.2;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 1.2;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    this.renderLoop = this.renderLoop.bind(this);
    this.reqId = requestAnimationFrame(this.renderLoop);
  }

  public updateData(keyStats: Record<string, KeyResult>) {
    const keyArray = Object.values(keyStats);
    this.surfaceKeys = keyArray.filter((k) => IS_SURFACE_KEY(k.key));
    if (this.surfaceKeys.length === 0) return;

    const N = this.surfaceKeys.length;
    const M1 = this.innerBorderPoints.length;
    const M2 = this.outerBorderPoints.length;
    this.positions = new Float32Array((N + M1 + M2) * 3);
    
    // Clear previous meshes
    this.scene.children = this.scene.children.filter(c => c instanceof THREE.Light || c instanceof THREE.GridHelper);
    this.dropLineGeometries = [];
    
    // Recreate geometry and materials
    // 1. Fill active key positions
    this.surfaceKeys.forEach((k, i) => {
      const pos = this.get3DPos(k, 0);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
    });

    // 2. Fill inner boundary positions (always y = SURFACE_Y_OFFSET)
    this.innerBorderPoints.forEach((bp, i) => {
      const idx = (N + i) * 3;
      this.positions[idx] = bp[0];
      this.positions[idx + 1] = SURFACE_Y_OFFSET;
      this.positions[idx + 2] = bp[1];
    });

    // 3. Fill outer boundary positions (always y = SURFACE_Y_OFFSET)
    this.outerBorderPoints.forEach((bp, i) => {
      const idx = (N + M1 + i) * 3;
      this.positions[idx] = bp[0];
      this.positions[idx + 1] = SURFACE_Y_OFFSET;
      this.positions[idx + 2] = bp[1];
    });

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    if (N >= 3) {
      const points: Array<[number, number]> = [];
      // Add active keys
      this.surfaceKeys.forEach((k) => {
        const layout = KEY_LAYOUT[k.key.toLowerCase()];
        if (layout) {
          points.push([layout.x, layout.z]);
        } else {
          const x = (k.x - centerX) * SCALE;
          const z = (((2.0 - k.y) * (1 + GAP)) - centerZ) * SCALE;
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

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3861fb,
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

    const mesh = new THREE.Mesh(this.geometry, glassMaterial);
    this.scene.add(mesh);

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x5377fc,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wireframeMesh = new THREE.Mesh(this.geometry, wireframeMaterial);
    wireframeMesh.position.y += 0.1;
    this.scene.add(wireframeMesh);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3861fb,
      transparent: true,
      opacity: 0.3,
    });

    const keycapMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3139,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.surfaceKeys.forEach((k) => {
      const pTop = this.get3DPos(k, 0);
      const pBase = new THREE.Vector3(pTop.x, 0, pTop.z);
      const lineGeom = new THREE.BufferGeometry().setFromPoints([pTop, pBase]);
      const line = new THREE.Line(lineGeom, lineMaterial);
      this.scene.add(line);
      this.dropLineGeometries.push(lineGeom);
    });

    keyArray.forEach((k) => {
      const layout = KEY_LAYOUT[k.key.toLowerCase()];
      if (!layout) return;

      const boxW = layout.w - (GAP * SCALE);
      const boxD = layout.h - (GAP * SCALE);
      const boxGeom = new THREE.BoxGeometry(boxW, 10, boxD);
      const boxMesh = new THREE.Mesh(boxGeom, keycapMaterial);
      // y=0 is the top of the keycaps (base level), so center y at -5
      boxMesh.position.set(layout.x, -5, layout.z);
      this.scene.add(boxMesh);
    });
    
    // Apply current animState to geometry
    this.applyAnimState(false);
  }
  
  public get3DPos(k: KeyResult, elevationScale: number) {
    const keyName = k.key.toLowerCase();
    const layout = KEY_LAYOUT[keyName];

    if (layout) {
      return new THREE.Vector3(
        layout.x,
        SURFACE_Y_OFFSET + k.zSmoothed * elevationScale,
        layout.z
      );
    }
    
    // Fallback: apply same transformation as KEY_LAYOUT
    const x = (k.x - centerX) * SCALE;
    const z = (((2.0 - k.y) * (1 + GAP)) - centerZ) * SCALE;
    return new THREE.Vector3(x, SURFACE_Y_OFFSET + k.zSmoothed * elevationScale, z);
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
      this.timeline = gsap.timeline({
        onUpdate: () => this.applyAnimState()
      });
      
      const TARGET_ELEVATION_SCALE = 120;
      const CAM_TARGET_Y = 480;
      const CAM_TARGET_Z = 480;
      
      // Delay for cross-fade
      this.timeline.to({}, { duration: TRANSITION_TIMING.surfaceCrossFadeDelay });

      // Then animate elevation and camera
      this.timeline.to(this.animState, {
        elevationScale: TARGET_ELEVATION_SCALE,
        camY: CAM_TARGET_Y,
        camZ: CAM_TARGET_Z,
        opacity: 1,
        duration: TRANSITION_TIMING.surfaceElevationDuration,
        ease: "power3.out", // Equivalent to 1 - (1-p)^3
        onComplete: () => {
          this.controls.target.set(0, 0, 0);
        }
      });
    } else {
      // Reset immediately
      this.animState.elevationScale = 0;
      this.animState.camY = this.dist;
      this.animState.camZ = 0.1;
      this.animState.opacity = 0;
      this.camera.position.set(0, this.dist, 0.1);
      this.camera.lookAt(0, 0, 0);
      this.applyAnimState();
    }
  }

  private applyAnimState(updateCamera = true) {
    if (updateCamera) {
      this.camera.position.set(0, this.animState.camY, this.animState.camZ);
      this.camera.lookAt(0, 0, 0);
    }
    
    this.surfaceKeys.forEach((k, i) => {
      const currentY = SURFACE_Y_OFFSET + k.zSmoothed * this.animState.elevationScale;
      this.positions[i * 3 + 1] = currentY;

      if (this.dropLineGeometries[i]) {
        const linePos = this.dropLineGeometries[i].attributes.position as THREE.BufferAttribute;
        linePos.setY(0, currentY);
        linePos.needsUpdate = true;
      }
    });

    if (this.geometry.attributes.position) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.computeVertexNormals();
    }
  }

  private renderLoop() {
    this.reqId = requestAnimationFrame(this.renderLoop);
    
    // Only update orbit controls if entrance is done
    if (this.timeline && !this.timeline.isActive() && this.isActivated) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
    
    if (this.onUpdateHUD) {
      this.onUpdateHUD(this.surfaceKeys, this.animState.elevationScale, this.camera, this.animState.opacity);
    }
  }

  public dispose() {
    cancelAnimationFrame(this.reqId);
    if (this.timeline) this.timeline.kill();
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
