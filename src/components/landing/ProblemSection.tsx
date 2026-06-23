"use client";

import React from "react";
import { motion } from "framer-motion";

interface ProblemSectionProps {
  isEn?: boolean;
}

const pains = [
  {
    quoteKo: "WPM은 오르는데, 체감 속도는 그대로예요.",
    quoteEn: "My WPM goes up, but it doesn't feel any faster.",
    detailKo: "평균 속도만 보면 놓치는 구간별 병목이 있습니다.",
    detailEn: "Averages hide the specific transitions slowing you down.",
  },
  {
    quoteKo: "특정 키 조합에서만 자꾸 멈춰요.",
    quoteEn: "I keep stalling on the same key pairs.",
    detailKo: "R→T, ㅅ→ㅎ, Shift 조합… 반복되는 약점이 있습니다.",
    detailEn: "R→T, awkward jamo pairs, Shift combos — the same weak spots.",
  },
  {
    quoteKo: "오타 원인을 모르니 같은 실수를 반복해요.",
    quoteEn: "I repeat the same mistakes without knowing why.",
    detailEn: "Without knowing where you hesitate, practice stays guesswork.",
    detailKo: "어디서 망설이는지 모르면 연습은 추측에 그칩니다.",
  },
];

export const ProblemSection: React.FC<ProblemSectionProps> = ({ isEn = false }) => {
  return (
    <section className="problem-section">
      <div className="problem-inner">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-eyebrow">{isEn ? "Sound Familiar?" : "이런 경험, 있으시죠"}</p>
          <h2 className="section-title">
            {isEn ? "Speed isn't the whole story." : "속도는 괜찮은데, 왜 여기서만 막히지?"}
          </h2>
          <p className="section-subtitle">
            {isEn
              ? "Most typing tests tell you how fast you are. They don't tell you where you're stuck."
              : "대부분의 타자 테스트는 '얼마나 빠른지'만 알려줍니다. '어디서 막히는지'는 알려주지 않죠."}
          </p>
        </motion.div>

        <div className="problem-grid">
          {pains.map((pain, i) => (
            <motion.div
              key={pain.quoteEn}
              className="problem-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="problem-quote">{isEn ? pain.quoteEn : pain.quoteKo}</p>
              <p className="problem-detail">{isEn ? pain.detailEn : pain.detailKo}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
