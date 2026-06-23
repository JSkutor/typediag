"use client";

import React, { useEffect, useState } from "react";
import { LatencySurface3D } from "@/components/workspace/LatencySurface3D";
import { getMockKeyStats } from "@/lib/skdm/mockLandingData";

export const LandingSurface3D: React.FC = () => {
  const [mockStats] = useState(() => getMockKeyStats());
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsActivated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-surface-3d">
      <LatencySurface3D
        keyStats={mockStats}
        isActivated={isActivated}
        disableControls
        isLanding
      />
    </div>
  );
};
