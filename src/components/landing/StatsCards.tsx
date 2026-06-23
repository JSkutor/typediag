"use client";

import React from "react";
import { motion } from "framer-motion";

interface StatsCardsProps {
  isEn?: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ isEn = false }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 2rem",
      }}
    >
      <StatCard
        title="Segmented Regression"
        subtitle={isEn ? "Bottleneck Detection" : "분절회귀 분석"}
        description={
          isEn
            ? "Rather than averaging your WPM, we mathematically segment keystroke delay patterns to pinpoint the exact cause of slowdowns and typos."
            : "단순한 평균 타이핑 속도(WPM)가 아닌, 키보드 입력 지연의 병목 구간을 수학적으로 분절하여 정확한 오타 및 지연 원인을 진단합니다."
        }
        delay={0.1}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 90"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient
                id="lineGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#3861fb" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[20, 45, 70].map((y) => (
              <line
                key={y}
                x1="10"
                y1={y}
                x2="190"
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            <motion.path
              d="M 10 75 L 75 65 L 115 28 L 190 18"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            <motion.circle
              cx="75"
              cy="65"
              r="5"
              fill="#e4e6eb"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            />
            <motion.circle
              cx="115"
              cy="28"
              r="5"
              fill="#e4e6eb"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: 0.9 }}
            />
            {/* Breakpoint lines */}
            <motion.line
              x1="75"
              y1="10"
              x2="75"
              y2="75"
              stroke="rgba(244,63,94,0.3)"
              strokeWidth="1"
              strokeDasharray="3 3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            />
            <motion.line
              x1="115"
              y1="10"
              x2="115"
              y2="75"
              stroke="rgba(244,63,94,0.3)"
              strokeWidth="1"
              strokeDasharray="3 3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            />
          </svg>
        </div>
      </StatCard>

      <StatCard
        title="Keystroke Dynamics"
        subtitle={isEn ? "Hold & Flight Time" : "입력 지속 시간 (Duration)"}
        description={
          isEn
            ? "We separately measure each key's hold duration and inter-key flight time to map your physical typing habits in 3D space."
            : "개별 키의 누름 지속 시간(Hold Duration)과 키 간 이동 시간(Flight Time)을 분리 측정하여 물리적 타건 습관을 3D 공간 상에 매핑합니다."
        }
        delay={0.2}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <motion.div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(56, 97, 251, 0.15)",
              border: "1.5px solid rgba(56,97,251,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e4e6eb",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: "bold",
              fontSize: "15px",
            }}
            animate={{ boxShadow: ["0 0 0px rgba(56,97,251,0)", "0 0 12px rgba(56,97,251,0.5)", "0 0 0px rgba(56,97,251,0)"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            A
          </motion.div>

          <div
            style={{
              flex: 1,
              height: "2px",
              background: "rgba(228, 230, 235, 0.1)",
              position: "relative",
              margin: "0 12px",
              borderRadius: "2px",
            }}
          >
            <motion.div
              style={{
                position: "absolute",
                top: "50%",
                translateY: "-50%",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#f43f5e",
                boxShadow: "0 0 8px rgba(244,63,94,0.6)",
              }}
              animate={{ left: ["0%", "100%", "0%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <motion.div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1.5px solid rgba(244,63,94,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e4e6eb",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: "bold",
              fontSize: "15px",
            }}
            animate={{ boxShadow: ["0 0 0px rgba(244,63,94,0)", "0 0 12px rgba(244,63,94,0.5)", "0 0 0px rgba(244,63,94,0)"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
          >
            B
          </motion.div>
        </div>
      </StatCard>

      <StatCard
        title="Cylindrical Coordinates"
        subtitle={isEn ? "3D Spatial Mapping" : "3D 공간 지형 매핑"}
        description={
          isEn
            ? "Key transitions are plotted as vectors in a cylindrical (r, θ, z) space. The height represents latency, the angle encodes direction, and radius shows frequency."
            : "키 전환을 원통형(r, θ, z) 좌표 공간 상의 벡터로 표현합니다. 높이는 지연 시간, 각도는 방향, 반지름은 빈도를 나타냅니다."
        }
        delay={0.3}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="100"
            height="100"
            viewBox="-50 -50 100 100"
            style={{ overflow: "visible" }}
          >
            {/* Cylinder rings */}
            {[0, 1, 2].map((i) => (
              <motion.ellipse
                key={i}
                cx="0"
                cy={i * 10 - 10}
                rx={28 - i * 4}
                ry={(28 - i * 4) * 0.3}
                fill="none"
                stroke={`rgba(56,97,251,${0.15 + i * 0.1})`}
                strokeWidth="1"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              />
            ))}
            {/* Vectors */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const r = 18 + (i % 3) * 4;
              const x = r * Math.cos(rad);
              const y = r * Math.sin(rad) * 0.3 - (i % 2 === 0 ? 12 : 4);
              return (
                <motion.line
                  key={angle}
                  x1="0"
                  y1="10"
                  x2={x}
                  y2={y}
                  stroke={i % 2 === 0 ? "rgba(244,63,94,0.7)" : "rgba(56,97,251,0.7)"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                />
              );
            })}
            {/* Center axis */}
            <motion.line
              x1="0"
              y1="20"
              x2="0"
              y2="-28"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
              strokeDasharray="3 2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            />
          </svg>
        </div>
      </StatCard>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  subtitle: string;
  description: string;
  delay: number;
  children: React.ReactNode;
}> = ({ title, subtitle, description, delay, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}
      style={{
        background: "rgba(28, 38, 55, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "20px",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        cursor: "default",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>{children}</div>
      <h3
        style={{
          fontSize: "1.1rem",
          color: "var(--text-primary, #e4e6eb)",
          marginBottom: "0.2rem",
          fontWeight: 700,
        }}
      >
        {title}
      </h3>
      <h4
        style={{
          fontSize: "0.8rem",
          color: "var(--accent, #3861fb)",
          marginBottom: "0.85rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {subtitle}
      </h4>
      <p
        style={{
          color: "var(--text-secondary, #9ba1a6)",
          fontSize: "0.9rem",
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>
    </motion.div>
  );
};
