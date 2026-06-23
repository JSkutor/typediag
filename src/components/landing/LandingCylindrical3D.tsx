"use client";

import React, { useEffect, useState, useRef } from "react";
import { CylindricalVector3D } from "@/components/workspace/CylindricalVector3D";
import { getMockCylindricalEvents } from "@/lib/skdm/mockLandingData";
import { KeyEvent } from "@/lib/skdm/types";
import { motion, useInView } from "framer-motion";

export const LandingCylindrical3D: React.FC = () => {
  const [mockEvents, setMockEvents] = useState<KeyEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger animation when the component enters the viewport
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  useEffect(() => {
    let mounted = true;
    const data = getMockCylindricalEvents();
    if (mounted) {
      setTimeout(() => setMockEvents(data), 0);
    }
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {/* pointerEvents auto so labels can receive clicks — but controls are locked */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "auto" }}>
        <CylindricalVector3D
          isActivated={isInView}
          mockEvents={mockEvents}
          initialCenterKey="o"
          disableControls
          hidePanel
        />
      </div>
    </motion.div>
  );
};
