"use client";

import React from "react";
import { motion } from "framer-motion";

interface HowItWorksProps {
  isEn?: boolean;
}

const steps = [
  {
    num: "01",
    titleEn: "Capture Every Keystroke",
    titleKo: "모든 타건 캡처",
    descEn:
      "As you type, we record each key transition: from-key, to-key, latency in milliseconds, hold duration, and correctness via our MVSA alignment engine.",
    descKo:
      "타이핑하는 동안 모든 키 전환을 기록합니다. 이전 키, 다음 키, 지연 시간(ms), 누름 지속 시간, 그리고 MVSA 정렬 엔진을 통한 정오 여부까지 정밀하게 수집합니다.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
      </svg>
    ),
    accentColor: "#3861fb",
  },
  {
    num: "02",
    titleEn: "SKDM Pipeline",
    titleKo: "SKDM 파이프라인",
    descEn:
      "Raw events flow through outlier filtering, sigmoid normalization, and Delaunay-Laplacian smoothing to produce a spatial latency map across the keyboard geometry.",
    descKo:
      "원시 이벤트가 이상치 필터링, 시그모이드 정규화, Delaunay-Laplacian 스무딩 파이프라인을 거쳐 키보드 물리 좌표 위 공간 지연 지형으로 변환됩니다.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    accentColor: "#8b5cf6",
  },
  {
    num: "03",
    titleEn: "3D Spatial Diagnosis",
    titleKo: "3D 공간 진단",
    descEn:
      "Your weaknesses are rendered as a 3D latency surface and cylindrical vector field — so you can instantly see which key transitions are bottlenecking your speed.",
    descKo:
      "당신의 약점이 3D 지연 지형과 원통형 벡터 필드로 시각화됩니다. 어떤 키 전환이 속도를 저하시키는지 직관적으로 파악할 수 있습니다.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12M12 12L5 7M12 12L19 7M5 7L12 2L19 7M5 7V17L12 22L19 17V7" />
      </svg>
    ),
    accentColor: "#f43f5e",
  },
];

export const HowItWorks: React.FC<HowItWorksProps> = ({ isEn = false }) => {
  return (
    <section className="how-it-works-section">
      <div className="how-it-works-inner">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-eyebrow">
            {isEn ? "Under The Hood" : "작동 원리"}
          </p>
          <h2 className="section-title">
            {isEn ? "How TypeDiag Works" : "TypeDiag 동작 방식"}
          </h2>
          <p className="section-subtitle">
            {isEn
              ? "Three stages transform your raw keystrokes into actionable spatial insight."
              : "세 단계로 원시 타건 데이터를 공간적 진단 인사이트로 변환합니다."}
          </p>
        </motion.div>

        <div className="how-it-works-steps">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="hiw-step"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
            >
              {/* Step number + connector line */}
              <div className="hiw-step-left">
                <div
                  className="hiw-step-num"
                  style={{ color: step.accentColor, borderColor: step.accentColor + "40" }}
                >
                  {step.num}
                </div>
                {i < steps.length - 1 && <div className="hiw-connector" />}
              </div>

              {/* Content */}
              <div className="hiw-step-content">
                <div
                  className="hiw-icon"
                  style={{
                    background: step.accentColor + "18",
                    color: step.accentColor,
                    border: `1px solid ${step.accentColor}30`,
                  }}
                >
                  {step.icon}
                </div>
                <div>
                  <h3 className="hiw-step-title">
                    {isEn ? step.titleEn : step.titleKo}
                  </h3>
                  <p className="hiw-step-desc">
                    {isEn ? step.descEn : step.descKo}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
