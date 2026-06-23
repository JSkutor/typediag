"use client";

import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  initialX?: number;
  initialY?: number;
  duration?: number;
  viewportMargin?: string;
  whileHover?: MotionProps["whileHover"];
  style?: React.CSSProperties;
}

export function RevealOnScroll({
  children,
  className,
  delay = 0,
  initialX = 0,
  initialY = 20,
  duration = 0.55,
  viewportMargin = "-40px",
  whileHover,
  style,
}: RevealOnScrollProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, x: initialX, y: initialY }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: viewportMargin }}
      transition={{ duration, delay }}
      whileHover={whileHover}
    >
      {children}
    </motion.div>
  );
}
