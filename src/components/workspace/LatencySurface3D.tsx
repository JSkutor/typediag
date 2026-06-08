"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { KeyResult } from "@/lib/skdm";

interface LatencySurface3DProps {
  keyStats: Record<string, KeyResult>;
  triangles: Uint32Array;
  width?: number;
  height?: number;
}

export const LatencySurface3D: React.FC<LatencySurface3DProps> = ({
  keyStats,
  triangles,
  width = 800,
  height = 500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rotation angles
  // pitch: angle viewing the desk. 0 = top-down, Math.PI/3 = tilted
  // yaw: spinning the desk around its center
  const [rotation, setRotation] = useState({ pitch: Math.PI / 3, yaw: -0.1 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Constants for rendering
  const SCALE = 45; // pixel per layout unit
  const ELEVATION_SCALE = 120; // max pixel height of z=1
  const KEYCAP_SIZE = 0.85; // size of keycap outline relative to 1U

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    lastMouse.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const dx = clientX - lastMouse.current.x;
    const dy = clientY - lastMouse.current.y;
    
    lastMouse.current = { x: clientX, y: clientY };

    setRotation((prev) => {
      // Clamp pitch so it doesn't flip over (0 to 85 degrees)
      const newPitch = Math.max(0, Math.min(Math.PI / 2.1, prev.pitch + dy * 0.01));
      const newYaw = prev.yaw + dx * 0.01;
      return { pitch: newPitch, yaw: newYaw };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const keys = Object.values(keyStats);
    if (keys.length === 0) return;

    // 1. Calculate bounding box to center the keyboard
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    keys.forEach((k) => {
      if (k.x < minX) minX = k.x;
      if (k.x > maxX) maxX = k.x;
      if (k.y < minY) minY = k.y;
      if (k.y > maxY) maxY = k.y;
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // 2. 3D Projection Function
    const project = (x: number, y: number, z: number) => {
      // Model coords centered
      const mx = (x - cx) * SCALE;
      const my = (y - cy) * SCALE;
      const mz = z * ELEVATION_SCALE;

      // Rotate Yaw (around Z axis)
      const x1 = mx * Math.cos(rotation.yaw) - my * Math.sin(rotation.yaw);
      const y1 = mx * Math.sin(rotation.yaw) + my * Math.cos(rotation.yaw);
      const z1 = mz;

      // Rotate Pitch (around X axis)
      const x2 = x1;
      const y2 = y1 * Math.cos(rotation.pitch) - z1 * Math.sin(rotation.pitch);
      const z2 = y1 * Math.sin(rotation.pitch) + z1 * Math.cos(rotation.pitch);

      // Screen mapping
      const sx = width / 2 + x2;
      const sy = height / 2 - y2 + 50; // offset slightly down
      
      return { sx, sy, depth: z2 };
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // 3. Draw Background Base Layout (Vector Keycaps at Z=0)
      keys.forEach((k) => {
        const halfU = KEYCAP_SIZE / 2;
        // The 4 corners of the keycap at Z=0
        let w = halfU;
        if (k.key === "space") w = 3; // wide spacebar
        if (["backspace", "enter", "shift"].includes(k.key)) w = 1.2;

        const p1 = project(k.x - w, k.y + halfU, 0);
        const p2 = project(k.x + w, k.y + halfU, 0);
        const p3 = project(k.x + w, k.y - halfU, 0);
        const p4 = project(k.x - w, k.y - halfU, 0);
        
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.lineTo(p3.sx, p3.sy);
        ctx.lineTo(p4.sx, p4.sy);
        ctx.closePath();
        
        ctx.strokeStyle = "rgba(141, 146, 155, 0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Key label on the base
        const center = project(k.x, k.y, 0);
        ctx.fillStyle = "rgba(141, 146, 155, 0.3)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let label = k.key.toUpperCase();
        if (label === "SPACE") label = "";
        ctx.fillText(label, center.sx, center.sy);
      });

      // 4. Calculate 3D points for the mesh
      const meshPoints = keys.map(k => {
        const p = project(k.x, k.y, k.zSmoothed);
        return { ...k, ...p };
      });
      
      // Draw vertical drop lines from surface to base
      meshPoints.forEach(p => {
        const base = project(p.x, p.y, 0);
        ctx.beginPath();
        ctx.moveTo(p.sx, p.sy);
        ctx.lineTo(base.sx, base.sy);
        ctx.strokeStyle = `rgba(56, 97, 251, ${0.1 + p.zSmoothed * 0.3})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 5. Prepare Triangles for Painter's Algorithm
      if (triangles && triangles.length > 0) {
        const keyArray = Object.keys(keyStats);
        const triList = [];
        
        for (let i = 0; i < triangles.length; i += 3) {
          const idx1 = triangles[i];
          const idx2 = triangles[i+1];
          const idx3 = triangles[i+2];
          
          const k1 = keyStats[keyArray[idx1]];
          const k2 = keyStats[keyArray[idx2]];
          const k3 = keyStats[keyArray[idx3]];
          
          if (!k1 || !k2 || !k3) continue;

          const p1 = project(k1.x, k1.y, k1.zSmoothed);
          const p2 = project(k2.x, k2.y, k2.zSmoothed);
          const p3 = project(k3.x, k3.y, k3.zSmoothed);

          const avgDepth = (p1.depth + p2.depth + p3.depth) / 3;
          // Calculate average Z elevation for color mapping
          const avgZ = (k1.zSmoothed + k2.zSmoothed + k3.zSmoothed) / 3;

          triList.push({ p1, p2, p3, avgDepth, avgZ });
        }

        // Sort triangles by depth descending (draw furthest first)
        triList.sort((a, b) => b.avgDepth - a.avgDepth);

        // Draw triangles
        triList.forEach((tri) => {
          ctx.beginPath();
          ctx.moveTo(tri.p1.sx, tri.p1.sy);
          ctx.lineTo(tri.p2.sx, tri.p2.sy);
          ctx.lineTo(tri.p3.sx, tri.p3.sy);
          ctx.closePath();

          // Gradient fill based on elevation (zSmoothed is 0-1)
          const alpha = 0.15 + tri.avgZ * 0.4;
          ctx.fillStyle = `rgba(56, 97, 251, ${alpha})`;
          ctx.fill();

          ctx.strokeStyle = `rgba(56, 97, 251, ${0.3 + tri.avgZ * 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // 6. Draw floating key labels on the surface vertices
      meshPoints.forEach(p => {
        // Draw vertex point
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2 + p.zSmoothed * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 242, 245, ${0.5 + p.zSmoothed * 0.5})`;
        ctx.fill();

        // Draw label
        let label = p.key.toUpperCase();
        if (label === "SPACE" || label === "SHIFT" || label === "ENTER" || label === "BACKSPACE") label = "";
        
        if (label) {
          ctx.fillStyle = "rgba(228, 230, 235, 0.9)";
          ctx.font = "bold 12px var(--font-mono)";
          ctx.fillText(label, p.sx, p.sy - 10 - p.zSmoothed * 5);
        }
      });
    };

    draw();

    // To avoid creating a massive render loop when idle, we just draw once per state update.
    // The mouse drag updates the state, which triggers a re-render.
  }, [keyStats, triangles, width, height, rotation]);

  return (
    <div 
      style={{ 
        width, 
        height, 
        cursor: "grab", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center" 
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          maxWidth: "100%", 
          maxHeight: "100%", 
          outline: "none" 
        }} 
      />
    </div>
  );
};
