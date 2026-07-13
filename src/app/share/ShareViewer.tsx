"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { decodeGlobalSurface } from "@/utils/cylindricalStats/shareEncoder";
import { triangulate } from "@/lib/skdm";
import { LatencySurface3D } from "@/components/workspace/LatencySurface3D";

export default function ShareViewer() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  const { keyStats, triangles } = useMemo(() => {
    if (!data) return { keyStats: null, triangles: null };
    try {
      const stats = decodeGlobalSurface(data);
      const { triangles } = triangulate(stats);
      return { keyStats: stats, triangles };
    } catch (e) {
      console.error(e);
      return { keyStats: null, triangles: null };
    }
  }, [data]);

  if (!data || !keyStats || !triangles) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          backgroundColor: "var(--bg-base)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Invalid or missing 3D surface data.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--bg-base)",
        position: "relative",
      }}
    >
      <LatencySurface3D
        keyStats={keyStats}
        triangles={triangles}
        isActivated={true}
        disableControls={false}
        isLanding={false}
      />

      {/* Overlay to inform users what this is */}
      <div
        style={{
          position: "absolute",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "12px 24px",
          backgroundColor: "var(--bg-raised)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-panel)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        Shared TypeDiag Latency Surface
      </div>
    </div>
  );
}
