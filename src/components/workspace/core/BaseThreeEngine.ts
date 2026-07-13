import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * BaseThreeEngine
 *
 * Encapsulates the common Three.js boilerplate for 3D Managers:
 * Scene, Camera, Renderer, OrbitControls, Resize handling, and Render loop.
 */
export abstract class BaseThreeEngine {
  protected container: HTMLElement;
  protected width: number;
  protected height: number;

  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected renderer: THREE.WebGLRenderer;
  protected controls: OrbitControls;

  protected reqId: number = 0;
  protected needsRender: boolean = true;
  protected isDisposed: boolean = false;

  constructor(
    container: HTMLElement,
    width: number,
    height: number,
    fov: number = 50,
    near: number = 0.1,
    far: number = 1000,
  ) {
    this.container = container;
    this.width = width;
    this.height = height;

    // Scene setup
    this.scene = new THREE.Scene();

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // We defer the loop start to the subclass if they need setup first,
    // but typically we can bind here and let the subclass start it.
    this.animate = this.animate.bind(this);
  }

  protected startLoop(): void {
    if (!this.reqId) {
      this.reqId = requestAnimationFrame(this.animate);
    }
  }

  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.needsRender = true;
  }

  public dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.reqId);
    this.reqId = 0;

    if (this.camera.view) {
      this.camera.clearViewOffset();
    }

    this.controls.dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  private animate(): void {
    if (this.isDisposed) return;
    this.reqId = requestAnimationFrame(this.animate);
    this.renderFrame();
  }

  /**
   * Implemented by subclasses to handle per-frame updates, control updates, and `renderer.render()`.
   */
  protected abstract renderFrame(): void;

  /**
   * Utility to deeply dispose geometries and materials of a Three.js object.
   */
  protected disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.LineSegments ||
        child instanceof THREE.Points
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
}
