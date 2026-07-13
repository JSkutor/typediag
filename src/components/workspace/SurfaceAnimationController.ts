import gsap from "gsap";
import * as THREE from "three";
import { TARGET_ELEVATION_SCALE } from "./surfaceGeometry";

export interface SurfaceAnimState {
  elevationScale: number;
  camX: number;
  camY: number;
  camZ: number;
  opacity: number;
  fov: number;
}

export class SurfaceAnimationController {
  public state: SurfaceAnimState;
  private timeline: gsap.core.Timeline | null = null;
  private camera: THREE.PerspectiveCamera;
  private surfaceGroup: THREE.Group;
  private dist: number;

  constructor(camera: THREE.PerspectiveCamera, surfaceGroup: THREE.Group, dist: number) {
    this.camera = camera;
    this.surfaceGroup = surfaceGroup;
    this.dist = dist;

    this.state = {
      elevationScale: 0,
      camX: 0,
      camY: dist,
      camZ: 0.1,
      opacity: 0,
      fov: 45,
    };
  }

  public get isActive(): boolean {
    return this.timeline?.isActive() ?? false;
  }

  public kill(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }

  public applyAnimState(updateCamera: boolean = true): void {
    if (updateCamera) {
      this.camera.position.set(this.state.camX, this.state.camY, this.state.camZ);
      this.camera.fov = this.state.fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(0, 0, 0);
    }

    if (this.surfaceGroup) {
      const scaleY = this.state.elevationScale / TARGET_ELEVATION_SCALE;
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
            m.opacity = this.state.opacity * (m.userData.baseOpacity ?? 0.62);
          }
        }
      });
    }
  }

  public playActivationAnim(
    isLanding: boolean,
    onUpdate: () => void,
    onComplete: () => void,
  ): void {
    this.kill();

    this.state.elevationScale = 0;
    this.state.opacity = 0;

    if (isLanding) {
      this.state.camX = 600;
      this.state.camY = 150;
      this.state.camZ = -600;
      this.state.fov = 60;
    } else {
      this.state.camX = 0;
      this.state.camY = 250;
      this.state.camZ = -500;
      this.state.fov = 60;
    }

    this.applyAnimState(true);

    requestAnimationFrame(() => {
      this.kill();

      this.timeline = gsap.timeline({
        onUpdate: () => {
          this.applyAnimState(true);
          onUpdate();
        },
        onComplete: () => {
          onComplete();
        },
      });

      let targetCamX = 0;
      let targetCamY = 480;
      let targetCamZ = 480;
      let duration = 0.8;

      if (isLanding) {
        targetCamX = 400;
        targetCamY = 350;
        targetCamZ = 400;
        duration = 1.2;
      }

      this.timeline.to(
        this.state,
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
        this.state,
        {
          elevationScale: TARGET_ELEVATION_SCALE,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.2)",
        },
        0.15,
      );
    });
  }

  public resetToDeactivated(): void {
    this.kill();
    this.state.elevationScale = 0;
    this.state.camX = 0;
    this.state.camY = this.dist;
    this.state.camZ = 0.1;
    this.state.opacity = 0;
    this.state.fov = 45;
    this.applyAnimState(true);
  }
}
