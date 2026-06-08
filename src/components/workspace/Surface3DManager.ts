import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Delaunay } from "d3-delaunay";
import { KeyResult } from "@/lib/skdm";
import gsap from "gsap";
import { TRANSITION_TIMING } from "./flightChoreography";

const IS_SURFACE_KEY = (key: string) => {
  const lower = key.toLowerCase();
  return /^[a-z]$/.test(lower) || lower === "," || lower === ".";
};

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

  // Stored for fallback/computation
  private canvasRect: DOMRect;
  private scaleX: number;
  private scaleY: number;
  private keycapRects: Record<string, DOMRect | { left: number; top: number; width: number; height: number }> = {};
  
  constructor(container: HTMLDivElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    
    const fovRad = (45 * Math.PI) / 180;
    this.dist = height / (2 * Math.tan(fovRad / 2));
    this.camera.position.set(0, this.dist, 0.1);
    
    this.animState.camY = this.dist;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
    
    this.geometry = new THREE.BufferGeometry();
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    
    this.canvasRect = container.getBoundingClientRect();
    this.scaleX = 1;
    this.scaleY = 1;

    this.renderLoop = this.renderLoop.bind(this);
    this.reqId = requestAnimationFrame(this.renderLoop);
  }

  public updateData(
    keyStats: Record<string, KeyResult>, 
    keycapRects: Record<string, DOMRect | { left: number; top: number; width: number; height: number }>, 
    dynamicScale: number
  ) {
    this.scaleX = dynamicScale;
    this.scaleY = dynamicScale;
    this.keycapRects = keycapRects;
    
    const expectedWidth = this.width * dynamicScale;
    const expectedHeight = this.height * dynamicScale;
    let rect = this.container.getBoundingClientRect();

    if (Math.abs(rect.width - expectedWidth) > 2 || Math.abs(rect.height - expectedHeight) > 2) {
      const winW = typeof window !== "undefined" ? window.innerWidth : 1024;
      const winH = typeof window !== "undefined" ? window.innerHeight : 768;
      const expectedLeft = (winW - expectedWidth) / 2;
      const expectedTop = (winH - expectedHeight) / 2;
      rect = {
        left: expectedLeft,
        top: expectedTop,
        right: expectedLeft + expectedWidth,
        bottom: expectedTop + expectedHeight,
        width: expectedWidth,
        height: expectedHeight,
        x: expectedLeft,
        y: expectedTop,
        toJSON: () => {},
      } as DOMRect;
    }
    this.canvasRect = rect;

    const keyArray = Object.values(keyStats);
    this.surfaceKeys = keyArray.filter((k) => IS_SURFACE_KEY(k.key));
    if (this.surfaceKeys.length === 0) return;

    this.positions = new Float32Array(this.surfaceKeys.length * 3);
    
    // Clear previous meshes
    this.scene.children = this.scene.children.filter(c => c instanceof THREE.Light);
    this.dropLineGeometries = [];
    
    // Recreate geometry and materials
    this.surfaceKeys.forEach((k, i) => {
      const pos = this.get3DPos(k, 0);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
    });

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    if (this.surfaceKeys.length >= 3) {
      const points: Array<[number, number]> = this.surfaceKeys.map((k) => {
        const keyName = k.key.toLowerCase();
        const r = this.keycapRects[keyName];
        if (r) {
          return [r.left + r.width / 2, r.top + r.height / 2];
        }
        return [k.x, k.y];
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
    const baseMaterial = new THREE.LineBasicMaterial({
      color: 0x8d929b,
      transparent: true,
      opacity: 0.15,
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
      const r = this.keycapRects[k.key.toLowerCase()];
      if (!r) return;

      const tx = r.left + r.width / 2;
      const ty = r.top + r.height / 2;
      const lx = (tx - this.canvasRect.left) / this.scaleX;
      const ly = (ty - this.canvasRect.top) / this.scaleY;

      const halfW = (r.width / 2) / this.scaleX;
      const halfH = (r.height / 2) / this.scaleY;

      const px = lx - this.width / 2;
      const pz = ly - this.height / 2;

      const p1 = new THREE.Vector3(px - halfW, 0, pz - halfH);
      const p2 = new THREE.Vector3(px + halfW, 0, pz - halfH);
      const p3 = new THREE.Vector3(px + halfW, 0, pz + halfH);
      const p4 = new THREE.Vector3(px - halfW, 0, pz + halfH);

      const boxGeom = new THREE.BufferGeometry().setFromPoints([p1, p2, p3, p4, p1]);
      const baseBox = new THREE.Line(boxGeom, baseMaterial);
      this.scene.add(baseBox);
    });
    
    // Apply current animState to geometry
    this.applyAnimState();
  }
  
  public get3DPos(k: KeyResult, elevationScale: number) {
    const keyName = k.key.toLowerCase();
    const rect = this.keycapRects[keyName];

    if (rect) {
      const tx = rect.left + rect.width / 2;
      const ty = rect.top + rect.height / 2;
      const lx = (tx - this.canvasRect.left) / this.scaleX;
      const ly = (ty - this.canvasRect.top) / this.scaleY;

      return new THREE.Vector3(
        lx - this.width / 2,
        k.zSmoothed * elevationScale,
        ly - this.height / 2
      );
    }
    
    return new THREE.Vector3(0, k.zSmoothed * elevationScale, 0); // fallback is less important here
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
      const CAM_TARGET_Y = 360;
      const CAM_TARGET_Z = 360;
      
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

  private applyAnimState() {
    this.camera.position.set(0, this.animState.camY, this.animState.camZ);
    this.camera.lookAt(0, 0, 0);
    
    this.surfaceKeys.forEach((k, i) => {
      const currentY = k.zSmoothed * this.animState.elevationScale;
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
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
