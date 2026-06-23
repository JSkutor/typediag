"use client";

import React from "react";
import { motion } from "framer-motion";

interface FeatureGridProps {
  isEn?: boolean;
}

const features = [
  {
    titleEn: "Topic Mode",
    titleKo: "토픽 모드",
    descEn:
      "Type about anything — React, economics, K-pop. AI generates fresh sentences matched to your interests. No repeats.",
    descKo:
      "React, 경제학, K-pop… 관심 있는 주제를 입력하면 AI가 맞춤 문장을 실시간 생성합니다. 같은 문장 반복 없음.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    accentColor: "var(--accent-secondary)",
  },
  {
    titleEn: "Hardcore Mode",
    titleKo: "하드코어 모드",
    descEn:
      "Drill the transitions you avoid. Rare and awkward jamo pairs are generated to push your weak spots.",
    descKo:
      "평소 피하는 조합만 골라 연습합니다. 손에 익지 않은 희귀한 자모 결합을 생성해 약점을 집중 단련합니다.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    accentColor: "var(--error)",
  },
  {
    titleEn: "No Sign-up",
    titleKo: "가입 없이 시작",
    descEn:
      "Open the page and start typing. Your sessions are saved automatically — log in later if you want.",
    descKo:
      "페이지를 열고 바로 타이핑하세요. 세션은 자동 저장되며, 원할 때 나중에 로그인해도 됩니다.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    accentColor: "var(--success)",
  },
  {
    titleEn: "Live Diagnostics",
    titleKo: "실시간 진단",
    descEn:
      "Switch to diagnostic view mid-session. Every key transition is measured in milliseconds, and your weakness map updates as you type.",
    descKo:
      "연습 중에도 진단 화면으로 전환할 수 있습니다. 키 전환마다 밀리초 단위로 측정되며, 약점 지도가 실시간으로 업데이트됩니다.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    accentColor: "var(--accent)",
  },
];

export const FeatureGrid: React.FC<FeatureGridProps> = ({ isEn = false }) => {
  return (
    <section className="feature-grid-section">
      <div className="feature-grid-inner">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-eyebrow">{isEn ? "Practice Modes" : "연습 모드"}</p>
          <h2 className="section-title">
            {isEn ? "Practice the way you want" : "원하는 방식으로 연습하세요"}
          </h2>
          <p className="section-subtitle">
            {isEn
              ? "Modes built to surface — and fix — your specific typing bottlenecks."
              : "당신만의 타건 병목을 드러내고 개선하도록 설계된 연습 모드입니다."}
          </p>
        </motion.div>

        <div className="feature-grid feature-grid--quad">
          {features.map((f, i) => (
            <motion.div
              key={f.titleEn}
              className="feature-card"
              style={{ "--feature-accent": f.accentColor } as React.CSSProperties}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -4 }}
            >
              <div
                className="feature-icon"
                style={{
                  background: `color-mix(in srgb, ${f.accentColor} 10%, transparent)`,
                  color: f.accentColor,
                  border: `1px solid color-mix(in srgb, ${f.accentColor} 20%, transparent)`,
                }}
              >
                {f.icon}
              </div>
              <h3 className="feature-title">{isEn ? f.titleEn : f.titleKo}</h3>
              <p className="feature-desc">{isEn ? f.descEn : f.descKo}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
