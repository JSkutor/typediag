"use client";

import React from "react";
import { motion } from "framer-motion";

interface FeatureGridProps {
  isEn?: boolean;
}

const features = [
  {
    titleEn: "Subject Mode",
    titleKo: "주제 모드",
    descEn:
      "Type about anything — AI generates targeted sentences via semantic vector search + Gemini LLM fallback. Zero repeat sentences.",
    descKo:
      "어떤 주제든 입력하면 AI가 벡터 유사도 검색 + Gemini LLM 폴백으로 맞춤 문장을 실시간 제공합니다. 문장 중복 없음.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    badge: "AI",
    badgeColor: "#8b5cf6",
    accentColor: "#8b5cf6",
    large: true,
  },
  {
    titleEn: "Hardcore Mode",
    titleKo: "하드코어 모드",
    descEn:
      "MLP neural net trained on Korean corpus inverts logits to force rare jamo transitions — then blends your SKDM weak-key scores.",
    descKo:
      "한국어 말뭉치 기반 MLP가 로짓을 반전시켜 희귀 자모 전이를 유도하고, 당신의 SKDM 취약 키 점수를 실시간 블렌딩합니다.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    badge: "Neural",
    badgeColor: "#f43f5e",
    accentColor: "#f43f5e",
    large: true,
  },
  {
    titleEn: "Session Tracking",
    titleKo: "세션 트래킹",
    descEn:
      "TimescaleDB hypertable stores every keystroke event. Sessions auto-split on 5-min gaps.",
    descKo:
      "TimescaleDB 하이퍼테이블이 모든 타건 이벤트를 저장. 5분 갭 시 세션 자동 분리.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    badge: "DB",
    badgeColor: "#57d68d",
    accentColor: "#57d68d",
    large: false,
  },
  {
    titleEn: "MVSA Aligner",
    titleKo: "MVSA 정렬 엔진",
    descEn:
      "Korean IME-aware alignment handles carry-over (도깨비불) and syllable composition mid-flight.",
    descKo:
      "한글 IME 조합 중간 상태와 도깨비불 현상을 처리하는 한국어 전용 실시간 자소 정렬 엔진.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    badge: "Core",
    badgeColor: "#f2c94c",
    accentColor: "#f2c94c",
    large: false,
  },
  {
    titleEn: "Guest Mode",
    titleKo: "게스트 모드",
    descEn:
      "No sign-up required. A persistent guest UUID is issued to localStorage for seamless first-run experience.",
    descKo:
      "회원가입 없이 바로 시작. 영구 게스트 UUID가 localStorage에 발급되어 끊김 없는 첫 경험을 제공합니다.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    badge: "UX",
    badgeColor: "#3861fb",
    accentColor: "#3861fb",
    large: false,
  },
  {
    titleEn: "Bilingual",
    titleKo: "한/영 이중 언어",
    descEn:
      "Full Korean and English support with shared diagnostic logic — practice in the language you think in.",
    descKo:
      "동일한 진단 로직으로 한국어/영어 모두 지원. 생각하는 언어로 연습하세요.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1m14 20-5-10-5 10M14 18h6" />
      </svg>
    ),
    badge: "i18n",
    badgeColor: "#3861fb",
    accentColor: "#3861fb",
    large: false,
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
          <p className="section-eyebrow">{isEn ? "Everything You Need" : "전부 갖춘 플랫폼"}</p>
          <h2 className="section-title">
            {isEn ? "Built Different" : "다르게 만들어진 타자 연습기"}
          </h2>
          <p className="section-subtitle">
            {isEn
              ? "Not just WPM. Every feature exists to surface the root cause of your typing bottlenecks."
              : "단순 WPM 측정을 넘어서. 모든 기능이 타건 병목의 근본 원인을 드러내기 위해 존재합니다."}
          </p>
        </motion.div>

        <div className="feature-grid">
          {features.map((f, i) => (
            <motion.div
              key={f.titleEn}
              className={`feature-card ${f.large ? "feature-card--large" : ""}`}
              style={{ "--feature-accent": f.accentColor } as React.CSSProperties}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -4 }}
            >
              <div className="feature-card-top">
                <div
                  className="feature-icon"
                  style={{
                    background: f.accentColor + "18",
                    color: f.accentColor,
                    border: `1px solid ${f.accentColor}30`,
                  }}
                >
                  {f.icon}
                </div>
                <span
                  className="feature-badge"
                  style={{
                    background: f.badgeColor + "18",
                    color: f.badgeColor,
                    border: `1px solid ${f.badgeColor}30`,
                  }}
                >
                  {f.badge}
                </span>
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
