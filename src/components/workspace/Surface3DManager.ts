import * as THREE from "three";
import { KeyResult } from "@/lib/skdm";
import { CYL_COLORS, SURFACE_Y_OFFSET } from "./geometryUtils";
import { computeZRange } from "./surfaceGeometry";
import { BaseThreeEngine } from "./core/BaseThreeEngine";
import { buildSurfaceMeshes, getSurface3DPos } from "./SurfaceMeshBuilder";
import { SurfaceAnimationController } from "./SurfaceAnimationController";

export interface SurfaceLabelProjection {
  key: string;
  x: number;
  y: number;
  visible: boolean;
}

export class Surface3DManager extends BaseThreeEngine {
  private floorGroup = new THREE.Group();
  private surfaceGroup = new THREE.Group();
  private surfaceKeys: KeyResult[] = [];
  
  private minZ: number = 0;
  private maxZ: number = 1;
  private zRange: number = 1;
  private dist: number;

  private _isLanding: boolean = false;
  private isActivated: boolean = false;

  private animController: SurfaceAnimationController;

  public onLabelsUpdate?: (
    labels: SurfaceLabelProjection[],
    opacity: number,
    anchorX: number,
    anchorY: number,
  ) => void;

  constructor(container: HTMLElement, width: number, height: number) {
    super(container, width, height, 45, 1, 3000);

    const fovRad = (45 * Math.PI) / 180;
    this.dist = height / (2 * Math.tan(fovRad / 2));
    this.camera.position.set(0, this.dist, 0.1);

    this.scene.background = new THREE.Color(CYL_COLORS.sceneBg);
    this.scene.fog = new THREE.FogExp2(CYL_COLORS.sceneBg, 0.001);

    const ambientLight = new THREE.AmbientLight(0x252830, 1.6);
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

    this.animController = new SurfaceAnimationController(this.camera, this.surfaceGroup, this.dist);

    this.startLoop();
  }

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

  public get animState() {
    return this.animController.state;
  }

  public lockControls(): void {
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
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
    this.surfaceKeys = keyArray.filter((k) => k.key.length === 1 || k.key === "_dummy_comma");
    if (this.surfaceKeys.length === 0) return;

    const range = computeZRange(this.surfaceKeys);
    this.minZ = range.minZ;
    this.maxZ = range.maxZ;
    this.zRange = range.zRange;

    this.clearSurfaceGroup();

    const meshes = buildSurfaceMeshes(this.surfaceKeys, this.minZ, this.maxZ, this.zRange, this.isLanding);
    
    this.surfaceGroup.add(meshes.surfaceMesh);
    this.surfaceGroup.add(meshes.wireframeMesh);
    if (meshes.borderLine) this.surfaceGroup.add(meshes.borderLine);
    if (meshes.dropMesh) this.surfaceGroup.add(meshes.dropMesh);
    this.surfaceGroup.add(meshes.logo);

    this.animController.applyAnimState(false);
    this.needsRender = true;
  }

  public getSurfaceKeys(): KeyResult[] {
    return this.surfaceKeys;
  }

  public getLabelWorldPos(k: KeyResult, elevationScale: number): THREE.Vector3 {
    const local = getSurface3DPos(k, this.minZ, this.zRange, 1.0); // using 1.0 for TARGET_ELEVATION_SCALE relative
    // To match original math: it was get3DPos(k, TARGET_ELEVATION_SCALE) which implies scale is TARGET_ELEVATION_SCALE. 
    // We'll pass elevationScale instead of TARGET_ELEVATION_SCALE. Wait, original did:
    // local = get3DPos(k, TARGET_ELEVATION_SCALE); scaleY = elevationScale / TARGET_ELEVATION_SCALE.
    // Let's just calculate directly with elevationScale.
    const localZPos = getSurface3DPos(k, this.minZ, this.zRange, elevationScale);
    return new THREE.Vector3(localZPos.x, SURFACE_Y_OFFSET + localZPos.y, localZPos.z);
  }

  public setActivated(activated: boolean) {
    if (this.isActivated === activated) return;
    this.isActivated = activated;

    if (activated) {
      this.controls.enabled = false;
      this.animController.playActivationAnim(
        this.isLanding,
        () => { this.needsRender = true; },
        () => {
          this.controls.enabled = !this.isLanding;
          this.controls.target.set(0, 0, 0);
          this.controls.update();
        }
      );
    } else {
      this.animController.resetToDeactivated();
      this.needsRender = true;
    }
  }

  private projectLabels(): SurfaceLabelProjection[] {
    const wh = this.width / 2;
    const hh = this.height / 2;
    const labels: SurfaceLabelProjection[] = [];

    for (const k of this.surfaceKeys) {
      if (k.key.toLowerCase() === "_dummy_comma") continue;

      const world = this.getLabelWorldPos(k, this.animController.state.elevationScale);
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

  protected renderFrame(): void {
    const timelineActive = this.animController.isActive;
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
        this.animController.state.opacity,
        anchor.x * wh + wh,
        -anchor.y * hh + hh,
      );
    }

    this.needsRender = false;
  }

  public override dispose() {
    this.animController.kill();
    this.clearSurfaceGroup();
    super.dispose();
  }
}
