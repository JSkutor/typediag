"use client";

import React, { useState, useRef } from "react";
import { CylindricalVector3D } from "@/components/workspace/CylindricalVector3D";
import { getMockCylindricalEvents } from "@/lib/skdm/mockLandingData";
import { motion, useInView } from "framer-motion";

export const LandingCylindrical3D: React.FC = () => {
  const [mockEvents] = useState(() => getMockCylindricalEvents());
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={containerRef}
      className="landing-cylindrical-3d"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="landing-cylindrical-3d__canvas">
        <CylindricalVector3D
          isActivated={isInView}
          mockEvents={mockEvents}
          disableControls
          hidePanel
        />
      </div>
    </motion.div>
  );
};
