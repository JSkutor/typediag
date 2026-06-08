"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Delaunay } from "d3-delaunay";
import { KeyResult } from "@/lib/skdm";
import { Flight } from "./flightChoreography";

interface LatencySurface3DProps {
  keyStats: Record<string, KeyResult>;
  triangles?: Uint32Array;
  width?: number;
  height?: number;
  flights?: Flight[];
  keycapRects?: Record<string, DOMRect>;
  isActivated?: boolean;
  dynamicScale?: number;
}

const IS_SURFACE_KEY = (key: string) => {
  const lower = key.toLowerCase();
  // Alpha keys + comma + period
  return /^[a-z]$/.test(lower) || lower === "," || lower === ".";
};

export const LatencySurface3D: React.FC<LatencySurface3DProps> = ({
  keyStats,
  width = 800,
  height = 500,
  flights = [],
  keycapRects = {},
  isActivated = false,
  dynamicScale = 1,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  const isActivatedRef = useRef(isActivated);
  useEffect(() => {
    isActivatedRef.current = isActivated;
  }, [isActivated]);

  // Track keys for HUD rendering (only surface keys)
  const [keys, setKeys] = useState<KeyResult[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const expectedWidth = width * dynamicScale;
    const expectedHeight = height * dynamicScale;
    let canvasRect = mount.getBoundingClientRect();

    // If the measured size differs significantly from the expected scaled size,
    // the scale transform has not been fully applied/laid out by the browser yet.
    // We override the rect's dimensions and position with the mathematically expected ones.
    if (Math.abs(canvasRect.width - expectedWidth) > 2 || Math.abs(canvasRect.height - expectedHeight) > 2) {
      const winW = typeof window !== "undefined" ? window.innerWidth : 1024;
      const winH = typeof window !== "undefined" ? window.innerHeight : 768;
      const expectedLeft = (winW - expectedWidth) / 2;
      const expectedTop = (winH - expectedHeight) / 2;
      canvasRect = {
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

    const scaleX = dynamicScale;
    const scaleY = dynamicScale;
    const keyArray = Object.values(keyStats);
    const surfaceKeys = keyArray.filter((k) => IS_SURFACE_KEY(k.key));
    setKeys(surfaceKeys);

    if (keyArray.length === 0) return;

    // --- 1. Init Scene, Camera, Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);

    // Calculate camera distance to map 3D units to 2D pixels 1:1 on Z=0 plane
    const fovRad = (45 * Math.PI) / 180;
    const dist = height / (2 * Math.tan(fovRad / 2));
    
    // Start camera directly overhead to perfectly match the flat 2D layout
    camera.position.set(0, dist, 0.1); // Z=0.1 avoids OrbitControls flip bug

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    mount.appendChild(renderer.domElement);

    // --- 2. Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x3861fb, 2.5); // Cobalt highlight
    directionalLight.position.set(100, 200, 50);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight2.position.set(-100, 150, -50);
    scene.add(directionalLight2);

    // --- 3. Compute Coordinates & Geometry ---
    const SCALE = 45; // Fallback units
    const TARGET_ELEVATION_SCALE = 120;

    // Calculate center fallback offsets
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    keyArray.forEach((k) => {
      if (k.x < minX) minX = k.x;
      if (k.x > maxX) maxX = k.x;
      if (k.y < minY) minY = k.y;
      if (k.y > maxY) maxY = k.y;
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const get3DPos = (k: KeyResult, elevationScale: number) => {
      const keyName = k.key.toLowerCase();
      const rect = keycapRects[keyName];

      if (rect) {
        // Calculate center screen coordinates relative to canvas bounding box
        const tx = rect.left + rect.width / 2;
        const ty = rect.top + rect.height / 2;

        const lx = (tx - canvasRect.left) / scaleX;
        const ly = (ty - canvasRect.top) / scaleY;

        // Map relative 2D pixel to 3D world (Three.js center is 0, 0)
        return new THREE.Vector3(
          lx - width / 2,
          k.zSmoothed * elevationScale,
          ly - height / 2
        );
      }
      
      // Fallback
      return new THREE.Vector3(
        (k.x - cx) * SCALE,
        k.zSmoothed * elevationScale,
        -(k.y - cy) * SCALE
      );
    };

    // Prepare arrays for BufferGeometry (only surface keys)
    const positions = new Float32Array(surfaceKeys.length * 3);
    const keyToSurfaceIndex: Record<string, number> = {};

    surfaceKeys.forEach((k, i) => {
      keyToSurfaceIndex[k.key] = i;
      const pos = get3DPos(k, 0); // Start flat
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Perform Delaunay triangulation only on surfaceKeys (alpha + comma + period)
    if (surfaceKeys.length >= 3) {
      const points: Array<[number, number]> = surfaceKeys.map((k) => {
        const keyName = k.key.toLowerCase();
        const rect = keycapRects[keyName];
        if (rect) {
          return [rect.left + rect.width / 2, rect.top + rect.height / 2];
        }
        return [k.x, k.y];
      });
      const delaunay = Delaunay.from(points);
      geometry.setIndex(Array.from(delaunay.triangles));
      geometry.computeVertexNormals();
    }

    // --- 4. Materials ---
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

    const mesh = new THREE.Mesh(geometry, glassMaterial);
    scene.add(mesh);

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x5377fc,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    wireframeMesh.position.y += 0.1;
    scene.add(wireframeMesh);

    // --- 5. Base Layout & Drop Lines ---
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

    const dropLineGeometries: THREE.BufferGeometry[] = [];

    // Drop lines only for surface keys
    surfaceKeys.forEach((k) => {
      const pTop = get3DPos(k, 0);
      const pBase = new THREE.Vector3(pTop.x, 0, pTop.z);

      const lineGeom = new THREE.BufferGeometry().setFromPoints([pTop, pBase]);
      const line = new THREE.Line(lineGeom, lineMaterial);
      scene.add(line);
      dropLineGeometries.push(lineGeom);
    });

    // Base outline boxes aligned 100% with the real HTML keys
    keyArray.forEach((k) => {
      const rect = keycapRects[k.key.toLowerCase()];
      if (!rect) return;

      const tx = rect.left + rect.width / 2;
      const ty = rect.top + rect.height / 2;
      const lx = (tx - canvasRect.left) / scaleX;
      const ly = (ty - canvasRect.top) / scaleY;

      const halfW = (rect.width / 2) / scaleX;
      const halfH = (rect.height / 2) / scaleY;

      const px = lx - width / 2;
      const pz = ly - height / 2;

      // Draw box boundary lines matching the physical client width and height
      const p1 = new THREE.Vector3(px - halfW, 0, pz - halfH);
      const p2 = new THREE.Vector3(px + halfW, 0, pz - halfH);
      const p3 = new THREE.Vector3(px + halfW, 0, pz + halfH);
      const p4 = new THREE.Vector3(px - halfW, 0, pz + halfH);

      const boxGeom = new THREE.BufferGeometry().setFromPoints([
        p1,
        p2,
        p3,
        p4,
        p1,
      ]);
      const baseBox = new THREE.Line(boxGeom, baseMaterial);
      scene.add(baseBox);
    });

    // --- 6. OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // --- 7. Render Loop & Entrance Animation ---
    let activationTime: number | null = null;
    let startTime: number | null = null;
    let reqId: number;
    let isEntranceAnimDone = false;

    // Camera targets
    const CAM_START_Y = dist;
    const CAM_START_Z = 0.1;
    const CAM_TARGET_Y = 360;
    const CAM_TARGET_Z = 360;

    const render = (time: number) => {
      reqId = requestAnimationFrame(render);

      let elevationScale = 0;

      if (isActivatedRef.current) {
        if (activationTime === null) {
          activationTime = time;
        }

        const elapsedSinceActivation = time - activationTime;

        if (elapsedSinceActivation < 220) {
          // Keep flat during cross-fade (first 220ms)
          elevationScale = 0;
          camera.position.set(0, dist, 0.1);
          camera.lookAt(0, 0, 0);

          // Update mesh heights to 0
          surfaceKeys.forEach((k, i) => {
            positions[i * 3 + 1] = 0;

            // Update drop lines to 0
            const linePos = dropLineGeometries[i].attributes
              .position as THREE.BufferAttribute;
            linePos.setY(0, 0);
            linePos.needsUpdate = true;
          });

          geometry.attributes.position.needsUpdate = true;
          geometry.computeVertexNormals();
        } else {
          // Start tilt/elevation animation after 220ms delay
          if (startTime === null) {
            startTime = time;
          }

          const elapsedAnim = time - startTime;
          const progress = Math.min(elapsedAnim / 1200, 1);

          // Cubic ease out
          const easeOut = 1 - Math.pow(1 - progress, 3);

          elevationScale = TARGET_ELEVATION_SCALE * easeOut;

          if (!isEntranceAnimDone) {
            const camY = CAM_START_Y - (CAM_START_Y - CAM_TARGET_Y) * easeOut;
            const camZ = CAM_START_Z + (CAM_TARGET_Z - CAM_START_Z) * easeOut;

            camera.position.set(0, camY, camZ);
            camera.lookAt(0, 0, 0);
          }

          // Update mesh heights
          surfaceKeys.forEach((k, i) => {
            const currentY = k.zSmoothed * elevationScale;
            positions[i * 3 + 1] = currentY;

            // Update drop lines
            const linePos = dropLineGeometries[i].attributes
              .position as THREE.BufferAttribute;
            linePos.setY(0, currentY);
            linePos.needsUpdate = true;
          });

          geometry.attributes.position.needsUpdate = true;
          geometry.computeVertexNormals();

          if (progress === 1) {
            isEntranceAnimDone = true;
            controls.target.set(0, 0, 0);
          }
        }
      } else {
        // Reset animation state when not activated
        activationTime = null;
        startTime = null;
        isEntranceAnimDone = false;
        elevationScale = 0;

        camera.position.set(0, dist, 0.1);
        camera.lookAt(0, 0, 0);

        // Update mesh heights to 0
        surfaceKeys.forEach((k, i) => {
          positions[i * 3 + 1] = 0;

          // Update drop lines to 0
          const linePos = dropLineGeometries[i].attributes
            .position as THREE.BufferAttribute;
          linePos.setY(0, 0);
          linePos.needsUpdate = true;
        });

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
      }

      // If animation is done, we update OrbitControls
      if (isEntranceAnimDone) {
        controls.update();
      }

      renderer.render(scene, camera);

      // Update 2D HUD Positions
      if (labelsContainerRef.current) {
        camera.updateMatrixWorld();
        surfaceKeys.forEach((k) => {
          const vec = get3DPos(k, elevationScale);
          const scaleRatio = elevationScale / TARGET_ELEVATION_SCALE;
          vec.y += (10 + k.zSmoothed * 5) * scaleRatio;

          vec.project(camera);

          const x = (vec.x * 0.5 + 0.5) * width;
          const y = (vec.y * -0.5 + 0.5) * height;

          const el = document.getElementById(`hud-label-${k.key}`);
          if (el) {
            if (vec.z > 1) {
              el.style.display = "none";
            } else {
              el.style.display = "block";
              el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
              
              if (isActivatedRef.current) {
                if (startTime !== null) {
                  const elapsedAnim = time - startTime;
                  const progress = Math.min(elapsedAnim / 1200, 1);
                  el.style.opacity = `${progress}`;
                } else {
                  el.style.opacity = "0";
                }
              } else {
                el.style.opacity = "0";
              }
            }
          }
        });
      }
    };
    reqId = requestAnimationFrame(render);

    // Cleanup
    return () => {
      cancelAnimationFrame(reqId);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [keyStats, width, height, flights, keycapRects, dynamicScale]);

  // Prevent default touch behaviors on the container to allow 3D rotation
  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  return (
    <div
      style={{ position: "relative", width, height, overflow: "hidden" }}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          outline: "none",
          cursor: "grab",
        }}
      />

      {/* 2D HUD Labels Overlay */}
      <div
        ref={labelsContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {keys.map((k) => {
          let label = k.key.toUpperCase();
          if (
            ["SPACE", "SHIFT", "ENTER", "BACKSPACE"].includes(label)
          )
            label = "";
          if (!label) return null;

          return (
            <div
              key={k.key}
              id={`hud-label-${k.key}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                color: "rgba(228, 230, 235, 0.9)",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: "bold",
                fontSize: "12px",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                willChange: "transform, opacity",
                opacity: 0,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
