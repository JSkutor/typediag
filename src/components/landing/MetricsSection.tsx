"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface MetricsSectionProps {
  isEn?: boolean;
}

interface MetricItem {
  value: number;
  suffix: string;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
}

const metrics: MetricItem[] = [
  {
    value: 26,
    suffix: "",
    labelEn: "Keys Tracked",
    labelKo: "추적 키 수",
    descEn: "Full alphabetic coverage",
    descKo: "전체 알파벳 키 커버리지",
  },
  {
    value: 6,
    suffix: "",
    labelEn: "Diagnostic Metrics",
    labelKo: "진단 지표",
    descEn: "Hold, Flight, Shift, Hesitation, Error & Finger",
    descKo: "Hold, Flight, Shift, 머뭇거림, 오타, Finger",
  },
  {
    value: 4096,
    suffix: "D",
    labelEn: "Embedding Dim",
    labelKo: "임베딩 차원",
    descEn: "Upstage Solar for Subject Mode",
    descKo: "주제 모드 벡터 검색 임베딩",
  },
  {
    value: 50,
    suffix: "ms",
    labelEn: "Muggeò Tolerance",
    labelKo: "수렴 정밀도",
    descEn: "Breakpoint detection precision",
    descKo: "분절점 탐지 정밀도",
  },
];

function useCounter(target: number, isVisible: boolean) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!isVisible) return;
    const start = performance.now();
    const duration = 1500;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOut(progress) * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, isVisible]);

  return count;
}

const MetricCard: React.FC<{ metric: MetricItem; isEn: boolean; delay: number }> = ({
  metric,
  isEn,
  delay,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCounter(metric.value, isInView);

  return (
    <motion.div
      ref={ref}
      className="metric-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay }}
    >
      <div className="metric-value">
        {count.toLocaleString()}
        <span className="metric-suffix">{metric.suffix}</span>
      </div>
      <div className="metric-label">{isEn ? metric.labelEn : metric.labelKo}</div>
      <div className="metric-desc">{isEn ? metric.descEn : metric.descKo}</div>
    </motion.div>
  );
};

export const MetricsSection: React.FC<MetricsSectionProps> = ({ isEn = false }) => {
  return (
    <section className="metrics-section">
      <div className="metrics-inner">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-eyebrow">{isEn ? "By The Numbers" : "숫자로 보는 TypeDiag"}</p>
          <h2 className="section-title">
            {isEn ? "Built for Precision" : "정밀함을 위해 설계된 플랫폼"}
          </h2>
        </motion.div>

        <div className="metrics-grid">
          {metrics.map((m, i) => (
            <MetricCard key={m.labelEn} metric={m} isEn={isEn} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
};
