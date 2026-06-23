import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { LandingSurface3D } from "@/components/landing/LandingSurface3D";
import { LandingCylindrical3D } from "@/components/landing/LandingCylindrical3D";
import { StatsCards } from "@/components/landing/StatsCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MetricsSection } from "@/components/landing/MetricsSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

type Params = Promise<{ lang: string }>;

export default async function LangLandingPage({ params }: { params: Params }) {
  const { lang } = await params;
  const isEn = lang === "en";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-base, #2a2b2e)",
        color: "var(--text-primary, #e4e6eb)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, sans-serif)",
        overflowX: "hidden",
      }}
    >
      <Header />

      {/* ===== 1. Hero Section ===== */}
      <section
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: "#1a1b1e",
        }}
      >
        {/* 3D Surface Background — pointer-events:none so scroll wheel reaches the page */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <LandingSurface3D />
        </div>

        {/* Radial vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(26,27,30,0.5) 0%, rgba(26,27,30,0.85) 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Hero Content Overlay */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            pointerEvents: "none",
            padding: "0 2rem",
            maxWidth: "820px",
          }}
        >
          {/* Eyebrow pill badge */}
          <div style={{ pointerEvents: "auto", display: "inline-block", marginBottom: "1.4rem" }}>
            <span className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              SKDM — Spatial Keystroke Dynamics Model
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(3rem, 8vw, 6rem)",
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              marginBottom: "1.5rem",
              background: "linear-gradient(170deg, #ffffff 0%, rgba(255,255,255,0.45) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {isEn ? (
              <>
                Type Smarter.
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #3861fb 0%, #8b5cf6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Diagnose Deeper.
                </span>
              </>
            ) : (
              <>
                더 똑똑하게 타이핑하고,
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #3861fb 0%, #8b5cf6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  더 깊이 진단하세요.
                </span>
              </>
            )}
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.2rem)",
              color: "rgba(228, 230, 235, 0.7)",
              lineHeight: 1.75,
              maxWidth: "600px",
              margin: "0 auto 0 auto",
            }}
          >
            {isEn
              ? "Not just another WPM test. TypeDiag maps your typing bottlenecks onto a 3D spatial landscape using the Spatial Keystroke Dynamics Model to diagnose the root cause of every typo."
              : "단순한 타자 연습기가 아닙니다. 키보드 3D 공간 상에 지연 지형을 생성하여 SKDM 파이프라인으로 오타와 병목의 근본 원인을 진단합니다."}
          </p>

          {/* CTA row */}
          <div className="hero-cta-row" style={{ pointerEvents: "auto" }}>
            <Link href={`/${lang}/practice`} className="hero-start-button" id="hero-cta-button">
              {isEn ? "Start Free Diagnostics" : "무료 진단 시작하기"}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a href="#how-it-works" className="hero-secondary-link">
              {isEn ? "See how it works" : "작동 원리 보기"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "240px",
            background:
              "linear-gradient(to bottom, transparent 0%, var(--bg-base, #2a2b2e) 100%)",
            zIndex: 8,
            pointerEvents: "none",
          }}
        />

        {/* Scroll indicator */}
        <div
          className="scroll-indicator"
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 15,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(228, 230, 235, 0.35)",
            }}
          >
            scroll
          </span>
          <svg
            className="scroll-chevron"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(228,230,235,0.35)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ===== 2. How It Works ===== */}
      <div id="how-it-works">
        <HowItWorks isEn={isEn} />
      </div>

      {/* ===== 3. Metrics ===== */}
      <MetricsSection isEn={isEn} />

      {/* ===== 4. Cylindrical Vector Section ===== */}
      <section
        style={{
          position: "relative",
          width: "100%",
          padding: "7rem 8%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          gap: "5rem",
          backgroundColor: "var(--bg-base)",
        }}
        className="landing-cylindrical-section"
      >
        <div style={{ zIndex: 10 }}>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent, #3861fb)",
              marginBottom: "0.85rem",
            }}
          >
            {isEn ? "Micro Analysis" : "마이크로 분석"}
          </p>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)",
              fontWeight: 800,
              marginBottom: "1.25rem",
              color: "var(--text-primary)",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
            }}
          >
            {isEn ? "Cylindrical Vector Analysis" : "원통형 벡터 분석"}
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--text-secondary)",
              lineHeight: 1.75,
              marginBottom: "2rem",
            }}
          >
            {isEn
              ? "Every keystroke transition is mapped onto a cylindrical (r, θ, z) coordinate system. The angle encodes which finger is coming from, the radius shows frequency, and the height represents latency. Instantly see which transitions are bottlenecking your flow."
              : "모든 키 전환을 원통형 (r, θ, z) 좌표계에 매핑합니다. 각도는 어느 손가락이 오는지, 반지름은 빈도, 높이는 지연 시간을 나타냅니다. 어떤 전환이 당신의 흐름을 방해하는지 즉시 파악하세요."}
          </p>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.6rem",
            }}
          >
            {(isEn
              ? [
                  "θ = directional angle",
                  "r = transition frequency",
                  "z = average latency",
                  "Bottleneck highlighting",
                ]
              : [
                  "θ = 방향 각도",
                  "r = 전환 빈도",
                  "z = 평균 지연",
                  "병목 하이라이팅",
                ]
            ).map((item) => (
              <span
                key={item}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "9999px",
                  padding: "0.35rem 0.85rem",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Cylindrical 3D — fixed height with explicit container */}
        <div
          style={{
            height: "560px",
            minHeight: "400px",
            position: "relative",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(15,16,20,0.7)",
          }}
        >
          {/* Faded edges vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxShadow: "inset 0 0 50px 20px rgba(15,16,20,0.85)",
              zIndex: 5,
              pointerEvents: "none",
              borderRadius: "20px",
            }}
          />
          {/* Full-size inner wrapper for the 3D canvas */}
          <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <LandingCylindrical3D />
          </div>
        </div>
      </section>

      {/* ===== 5. Algorithm Stats Cards ===== */}
      <section
        className="stats-section-wrapper"
        style={{
          position: "relative",
          width: "100%",
          padding: "7rem 0 8rem",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "4rem",
            padding: "0 2rem",
          }}
        >
          <p
            className="section-eyebrow"
            style={{ display: "block" }}
          >
            {isEn ? "Algorithm Deep-Dive" : "알고리즘 심층 분석"}
          </p>
          <h2 className="section-title" style={{ margin: "0 auto 1rem auto" }}>
            {isEn ? "The Math Behind the Diagnosis" : "진단의 수학적 기반"}
          </h2>
          <p
            className="section-subtitle"
            style={{ margin: "0 auto", maxWidth: "560px" }}
          >
            {isEn
              ? "Beyond WPM: Segmented regression, Delaunay smoothing, and Muggeo's method find exactly where you hesitate."
              : "WPM을 넘어서: 분절 회귀, Delaunay 스무딩, Muggeo 알고리즘으로 당신이 주저하는 지점을 정확히 찾아냅니다."}
          </p>
        </div>
        <StatsCards isEn={isEn} />
      </section>

      {/* ===== 6. Feature Grid ===== */}
      <FeatureGrid isEn={isEn} />

      {/* ===== 7. CTA Section ===== */}
      <section className="cta-section">
        <div className="cta-inner">
          <p className="section-eyebrow">{isEn ? "Ready?" : "시작할 준비가 됐나요?"}</p>
          <h2 className="cta-title">
            {isEn ? (
              <>
                Find Your Bottleneck.
                <br />
                Break Your Ceiling.
              </>
            ) : (
              <>
                병목을 찾아내세요.
                <br />
                한계를 돌파하세요.
              </>
            )}
          </h2>
          <p className="cta-subtitle">
            {isEn
              ? "Start typing. TypeDiag will do the rest — mapping your spatial keystroke dynamics in real time."
              : "타이핑을 시작하세요. TypeDiag가 공간 타건 다이내믹스를 실시간으로 매핑합니다."}
          </p>

          <Link href={`/${lang}/practice`} className="hero-start-button" id="cta-final-button">
            {isEn ? "Start Free Diagnostics" : "무료 진단 시작하기"}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <p className="cta-note">
            {isEn
              ? "No account required · Works in your browser · Free forever"
              : "회원가입 불필요 · 브라우저에서 바로 실행 · 영원히 무료"}
          </p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <a href={`/${lang}`} className="landing-footer-logo">
            Type<span>Diag</span>
          </a>
          <span className="landing-footer-copy">
            &copy; {new Date().getFullYear()} TypeDiag. All rights reserved.
          </span>
          <nav className="landing-footer-links">
            <a href={`/${lang}/practice`}>{isEn ? "Practice" : "연습하기"}</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
