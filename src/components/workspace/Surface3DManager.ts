import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Delaunay } from "d3-delaunay";
import { KeyResult } from "@/lib/skdm";
import gsap from "gsap";
import { TRANSITION_TIMING } from "./flightChoreography";

import {
  IS_SURFACE_KEY,
  SURFACE_GAP,
  SURFACE_SCALE,
  SURFACE_Y_OFFSET,
  generateSurfaceLayout,
  calculateSurfaceBorders
} from "./geometryUtils";

const { layoutMap: KEY_LAYOUT, centerX, centerZ } = generateSurfaceLayout();
const { innerBorderPoints: _innerBorderPoints, outerBorderPoints: _outerBorderPoints } = calculateSurfaceBorders(KEY_LAYOUT);

export class Surface3DManager {
  private container: HTMLElement;
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

  constructor(container: HTMLElement, width: number, height: number) {
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
    this.innerBorderPoints = _innerBorderPoints;
    this.outerBorderPoints = _outerBorderPoints;
    
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
          const x = (k.x - centerX) * SURFACE_SCALE;
          const z = (((2.0 - k.y) * (1 + SURFACE_GAP)) - centerZ) * SURFACE_SCALE;
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

    this.surfaceKeys.forEach((k) => {
      const layout = KEY_LAYOUT[k.key.toLowerCase()];
      if (!layout) return;

      const boxW = layout.w - (SURFACE_GAP * SURFACE_SCALE);
      const boxD = layout.h - (SURFACE_GAP * SURFACE_SCALE);
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
    const x = (k.x - centerX) * SURFACE_SCALE;
    const z = (((2.0 - k.y) * (1 + SURFACE_GAP)) - centerZ) * SURFACE_SCALE;
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
