"use client";

import React from "react";
import { motion } from "framer-motion";

interface HowItWorksProps {
  isEn?: boolean;
}

const steps = [
  {
    num: "01",
    titleEn: "Type as usual",
    titleKo: "평소처럼 타이핑",
    descEn:
      "Every keystroke is captured — which keys you press, how long you hold them, and how long it takes to reach the next key.",
    descKo:
      "평소처럼 타이핑하세요. 어떤 키를 눌렀는지, 얼마나 누르고 있었는지, 다음 키까지 얼마나 걸렸는지 모두 기록됩니다.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
      </svg>
    ),
    accentColor: "var(--accent)",
  },
  {
    num: "02",
    titleEn: "Find your weak spots",
    titleKo: "약점 패턴 분석",
    descEn:
      "We analyze where your fingers hesitate — not your average speed, but the specific key pairs that slow you down.",
    descKo:
      "평균 속도가 아니라, 손가락이 막히는 지점을 분석합니다. 어떤 키 조합에서 멈추는지 패턴으로 찾아냅니다.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    accentColor: "var(--accent-secondary)",
  },
  {
    num: "03",
    titleEn: "See it on a weakness map",
    titleKo: "약점 지도로 시각화",
    descEn:
      "Your bottlenecks appear as peaks on a 3D keyboard landscape. High spots mean slow transitions — instantly obvious, no math required.",
    descKo:
      "병목 구간이 키보드 위 3D 지형의 봉우리로 나타납니다. 높을수록 느린 구간 — 수식 없이 한눈에 파악할 수 있습니다.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12M12 12L5 7M12 12L19 7M5 7L12 2L19 7M5 7V17L12 22L19 17V7" />
      </svg>
    ),
    accentColor: "var(--error)",
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
            {isEn ? "How It Works" : "작동 방식"}
          </p>
          <h2 className="section-title">
            {isEn ? "Three steps to know your habits" : "타이핑 습관을 아는 세 단계"}
          </h2>
          <p className="section-subtitle">
            {isEn
              ? "No setup, no jargon. Just type and see where you're stuck."
              : "설정도, 전문 용어도 필요 없습니다. 타이핑하고 어디가 막히는지 확인하세요."}
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
              <div className="hiw-step-left">
                <div
                  className="hiw-step-num"
                  style={{ color: step.accentColor, borderColor: `color-mix(in srgb, ${step.accentColor} 25%, transparent)` }}
                >
                  {step.num}
                </div>
                {i < steps.length - 1 && <div className="hiw-connector" />}
              </div>

              <div className="hiw-step-content">
                <div
                  className="hiw-icon"
                  style={{
                    background: `color-mix(in srgb, ${step.accentColor} 10%, transparent)`,
                    color: step.accentColor,
                    border: `1px solid color-mix(in srgb, ${step.accentColor} 20%, transparent)`,
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
