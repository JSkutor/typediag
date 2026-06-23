"use client";

import { motion } from "framer-motion";

interface DiagnosisBarFillProps {
  widthPercent: number;
  delay: number;
}

export function DiagnosisBarFill({ widthPercent, delay }: DiagnosisBarFillProps) {
  return (
    <motion.div
      className="diagnosis-bar-fill"
      initial={{ width: 0 }}
      whileInView={{ width: `${widthPercent}%` }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay }}
    />
  );
}
