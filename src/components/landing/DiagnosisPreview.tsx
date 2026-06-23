"use client";

import React from "react";
import { motion } from "framer-motion";

interface DiagnosisPreviewProps {
  isEn?: boolean;
}

const diagnosticDimensions = {
  labelEn: "6 diagnostic views",
  labelKo: "6가지 진단 관점",
  itemsEn: ["Hold", "Flight", "Shift", "Hesitation", "Errors", "Finger load"],
  itemsKo: ["누름", "이동", "Shift", "머뭇거림", "오타", "손가락 부하"],
};

const slowTransitions = [
  { pair: "R → T", ms: 340, bar: 92 },
  { pair: "ㅅ → ㅎ", ms: 285, bar: 78 },
  { pair: "Shift → P", ms: 241, bar: 66 },
  { pair: "L → ;", ms: 198, bar: 54 },
  { pair: "Space → A", ms: 176, bar: 48 },
];

export const DiagnosisPreview: React.FC<DiagnosisPreviewProps> = ({ isEn = false }) => {
  return (
    <section className="diagnosis-preview-section">
      <div className="diagnosis-preview-inner">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-eyebrow">{isEn ? "Your Report" : "진단 리포트"}</p>
          <h2 className="section-title">
            {isEn ? "One session. Actionable insight." : "연습 한 번이면, 이런 리포트가 나옵니다"}
          </h2>
          <p className="section-subtitle">
            {isEn
              ? "Not just a score — see exactly which key transitions are holding you back."
              : "점수만이 아닙니다. 어떤 키 전환이 당신을 막고 있는지 정확히 보여줍니다."}
          </p>

          <div className="diagnosis-dimensions">
            <span className="diagnosis-dimensions-label">
              {isEn ? diagnosticDimensions.labelEn : diagnosticDimensions.labelKo}
            </span>
            <div className="diagnosis-dimensions-pills">
              {(isEn ? diagnosticDimensions.itemsEn : diagnosticDimensions.itemsKo).map((item) => (
                <span key={item} className="landing-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="diagnosis-compare-grid">
          {/* Before — generic typing test */}
          <motion.div
            className="diagnosis-card diagnosis-card--before"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <span className="diagnosis-card-label">
              {isEn ? "Typical typing test" : "일반 타자 테스트"}
            </span>
            <div className="diagnosis-stat-row">
              <div className="diagnosis-stat">
                <span className="diagnosis-stat-value">87</span>
                <span className="diagnosis-stat-unit">WPM</span>
              </div>
              <div className="diagnosis-stat">
                <span className="diagnosis-stat-value">96</span>
                <span className="diagnosis-stat-unit">%</span>
              </div>
            </div>
            <p className="diagnosis-card-note">
              {isEn
                ? "Fast overall — but where are you actually slow?"
                : "전체적으로 빠르다고요? 그럼 어디가 느린 건가요?"}
            </p>
          </motion.div>

          {/* After — TypeDiag report */}
          <motion.div
            className="diagnosis-card diagnosis-card--after"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <span className="diagnosis-card-label diagnosis-card-label--accent">TypeDiag</span>

            <div className="diagnosis-highlight">
              <span className="diagnosis-highlight-key">R → T</span>
              <span className="diagnosis-highlight-ms">340ms</span>
              <span className="diagnosis-highlight-tag">
                {isEn ? "Bottleneck" : "병목"}
              </span>
            </div>

            <p className="diagnosis-insight">
              {isEn
                ? "Left pinky zone shows elevated latency. Focus practice recommended."
                : "왼손 새끼손가락 구간에서 지연이 집중됩니다. 집중 연습을 권장합니다."}
            </p>

            <div className="diagnosis-bars">
              <p className="diagnosis-bars-title">
                {isEn ? "Slowest transitions" : "가장 느린 키 전환"}
              </p>
              {slowTransitions.map((t, i) => (
                <div key={t.pair} className="diagnosis-bar-row">
                  <span className="diagnosis-bar-pair">{t.pair}</span>
                  <div className="diagnosis-bar-track">
                    <motion.div
                      className="diagnosis-bar-fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.bar}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
                    />
                  </div>
                  <span className="diagnosis-bar-ms">{t.ms}ms</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
