"use client";

import React, { useEffect, useState } from "react";
import { LatencySurface3D } from "@/components/workspace/LatencySurface3D";
import { getMockKeyStats } from "@/lib/skdm/mockLandingData";

export const LandingSurface3D: React.FC = () => {
  const [mockStats, setMockStats] = useState({});
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Generate data on client
    const data = getMockKeyStats();
    if (mounted) {
      // Use setTimeout to avoid synchronous setState inside useEffect warning
      setTimeout(() => setMockStats(data), 0);
    }

    const timer = setTimeout(() => {
      if (mounted) setIsActivated(true);
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", pointerEvents: "none" }}>
      <LatencySurface3D keyStats={mockStats} isActivated={isActivated} disableControls />
    </div>
  );
};
