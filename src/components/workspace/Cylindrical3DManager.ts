import * as THREE from "three";
import type { CylindricalVector } from "@/lib/skdm/cylindrical";
import { CYL_COLORS as C, toCylindricalCartesian } from "./geometryUtils";
import { BaseThreeEngine } from "./core/BaseThreeEngine";
import { buildFloorGroup, buildInactiveVectorLine, buildActiveVectorGroup, buildPetalMeshes } from "./CylindricalMeshBuilder";
import { buildPetalVertexColors } from "./cylindricalPetalGeometry";

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

export class Cylindrical3DManager extends BaseThreeEngine {
  private visualGroup = new THREE.Group();
  private floorGroup: THREE.Group;
  private pointLight: THREE.PointLight;

  private projectionGroup: THREE.Group | null = null;
  private petalMesh: THREE.Mesh | null = null;
  private petalBorder: THREE.Line | null = null;
  private originMarker: THREE.Mesh | null = null;
  private targetMesh: THREE.Mesh | null = null;

  private curCartesian: CartesianCoords = { x: 0, y: 0, z: 0 };
  private vectors: CylindricalVector[] = [];
  private vectorSignature = "";
  private drawerShiftPx = 0;
  
  private toggles: CylindricalToggles = {
    grid: true,
    projections: false,
    petal: true,
    autoRotate: false,
  };

  public onLabelsUpdate?: (labels: LabelProjection) => void;

  constructor(container: HTMLElement, width: number, height: number) {
    super(container, width, height, 50, 0.1, 1000);
    
    this.scene.background = new THREE.Color(C.sceneBg);
    this.scene.fog = new THREE.FogExp2(C.sceneBg, 0.014);

    this.camera.position.set(7, 8, 10);

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

    this.scene.add(this.visualGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.28);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(5, 15, 5);
    dir.castShadow = true;
    this.scene.add(dir);

    this.pointLight = new THREE.PointLight(C.targetNode, 1.5, 15);
    this.scene.add(this.pointLight);

    this.floorGroup = buildFloorGroup();
    this.scene.add(this.floorGroup);

    this.startLoop();
  }

  public lockControls(): void {
    this.controls.enableRotate = true;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
  }

  public updateScene(vectors: CylindricalVector[], selectedFrom: string): void {
    const nextSignature = vectors.map((v) => `${v.fromKey}:${v.theta}:${v.r}:${v.z}`).join("|");
    const geometryUnchanged = nextSignature === this.vectorSignature && vectors.length > 0;

    this.vectors = vectors;

    if (geometryUnchanged) {
      this.updatePetalHighlight(vectors, selectedFrom);
      this.clearVectorHighlights();
      this.rebuildVectorHighlights(vectors, selectedFrom);
      this.applyToggles();
      this.needsRender = true;
      return;
    }

    this.vectorSignature = nextSignature;
    this.clearVisualGroup();
    if (vectors.length === 0) return;

    // Build Petal surface
    const { petalMesh, petalBorder, originMarker } = buildPetalMeshes(vectors, selectedFrom);
    if (petalMesh && petalBorder && originMarker) {
      this.petalMesh = petalMesh;
      this.petalBorder = petalBorder;
      this.originMarker = originMarker;
      this.visualGroup.add(this.petalMesh, this.petalBorder, this.originMarker);
    }

    this.rebuildVectorHighlights(vectors, selectedFrom);

    this.applyToggles();
    this.needsRender = true;
  }

  public setToggles(toggles: CylindricalToggles): void {
    this.toggles = { ...toggles };
    this.applyToggles();
    this.needsRender = true;
  }

  public setDrawerShiftPx(shiftPx: number): void {
    const next = Math.max(0, shiftPx);
    if (Math.abs(next - this.drawerShiftPx) < 0.25) return;
    this.drawerShiftPx = next;
    this.applyDrawerViewOffset();
    this.needsRender = true;
  }

  private clearVisualGroup(): void {
    while (this.visualGroup.children.length > 0) {
      const child = this.visualGroup.children[0];
      this.visualGroup.remove(child);
      this.disposeObject3D(child);
    }
    this.projectionGroup = null;
    this.petalMesh = null;
    this.petalBorder = null;
    this.originMarker = null;
    this.targetMesh = null;
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
      this.disposeObject3D(child);
    }
    this.projectionGroup = null;
    this.targetMesh = null;
  }

  private rebuildVectorHighlights(vectors: CylindricalVector[], selectedFrom: string): void {
    for (const v of vectors) {
      if (v.fromKey === selectedFrom) continue;
      this.visualGroup.add(buildInactiveVectorLine(v));
    }

    const active = vectors.find((v) => v.fromKey === selectedFrom);
    if (active) {
      const { vx, vy, vz } = toCylindricalCartesian(active);
      this.curCartesian = { x: vx, y: vy, z: vz };

      this.pointLight.position.set(vx, vy, vz);
      this.pointLight.color.setHex(C.targetNode);
      this.pointLight.intensity = 0.32;
      this.pointLight.distance = 10;

      const { targetMesh, projectionGroup, visuals } = buildActiveVectorGroup(vx, vy, vz);
      this.targetMesh = targetMesh;
      this.projectionGroup = projectionGroup;
      
      this.visualGroup.add(visuals);
      this.visualGroup.add(this.projectionGroup);
    }
  }

  private applyToggles(): void {
    if (this.floorGroup) this.floorGroup.visible = this.toggles.grid;
    if (this.projectionGroup) this.projectionGroup.visible = this.toggles.projections;
    if (this.petalMesh) this.petalMesh.visible = this.toggles.petal;
    if (this.petalBorder) this.petalBorder.visible = this.toggles.petal;
  }

  private applyDrawerViewOffset(): void {
    this.camera.setViewOffset(
      this.width,
      this.height,
      -this.drawerShiftPx,
      0,
      this.width,
      this.height,
    );
  }

  public override resize(w: number, h: number): void {
    super.resize(w, h);
    this.applyDrawerViewOffset();
  }

  protected renderFrame(): void {
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

    if (this.onLabelsUpdate) {
      const wh = this.width / 2;
      const hh = this.height / 2;

      const oVec = new THREE.Vector3(0, 0, 0).project(this.camera);
      const tVec = this.targetMesh
        ? new THREE.Vector3(this.curCartesian.x, this.curCartesian.y, this.curCartesian.z).project(this.camera)
        : oVec.clone();

      const vectorCoords = this.vectors.map((v) => {
        const { vx, vy, vz } = toCylindricalCartesian(v);
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
