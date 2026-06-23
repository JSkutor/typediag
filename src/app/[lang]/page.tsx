import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { LandingSurface3D } from "@/components/landing/LandingSurface3D";
import { LandingCylindrical3D } from "@/components/landing/LandingCylindrical3D";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DiagnosisPreview } from "@/components/landing/DiagnosisPreview";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

type Params = Promise<{ lang: string }>;

export default async function LangLandingPage({ params }: { params: Params }) {
  const { lang } = await params;
  const isEn = lang === "en";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
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
          backgroundColor: "var(--bg-inset)",
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
              {isEn ? "Not WPM — typing habits" : "타자 속도가 아니라, 타자 습관"}
            </span>
          </div>

          <h1 className={`hero-headline ${isEn ? "hero-headline--en" : "hero-headline--ko"}`}>
            {isEn ? (
              <>
                <span className="hero-headline-line hero-headline-line--primary">Type Smarter.</span>
                <span className="hero-headline-line hero-headline-line--accent">Diagnose Deeper.</span>
              </>
            ) : (
              <>
                <span className="hero-headline-line hero-headline-line--primary">더 똑똑하게 타이핑하고,</span>
                <span className="hero-headline-line hero-headline-line--accent">더 깊이 진단하세요.</span>
              </>
            )}
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.2rem)",
              color: "var(--text-secondary)",
              lineHeight: 1.75,
              maxWidth: "600px",
              margin: "0 auto 0 auto",
            }}
          >
            {isEn
              ? "TypeDiag shows you where your fingers get stuck — not just how fast you type. See your weak spots on a 3D keyboard map."
              : "TypeDiag는 얼마나 빠른지가 아니라, 어디서 막히는지 알려줍니다. 키보드 위 약점 지도로 병목을 한눈에 확인하세요."}
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
            background: "linear-gradient(to bottom, transparent 0%, var(--bg-base) 100%)",
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
              color: "var(--text-muted)",
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
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ===== 2. Problem Empathy ===== */}
      <ProblemSection isEn={isEn} />

      {/* ===== 3. How It Works ===== */}
      <div id="how-it-works">
        <HowItWorks isEn={isEn} />
      </div>

      {/* ===== 4. Diagnosis Report Preview ===== */}
      <DiagnosisPreview isEn={isEn} />

      {/* ===== 5. Weakness Map (3D) ===== */}
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
              color: "var(--accent)",
              marginBottom: "0.85rem",
            }}
          >
            {isEn ? "Weakness Map" : "약점 지도"}
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
            {isEn ? "See where your fingers stall" : "손가락이 막히는 곳이 보입니다"}
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
              ? "Peaks on the 3D landscape mean slow transitions. The higher the peak, the more that key pair is holding you back — no formulas needed."
              : "3D 지형에서 봉우리가 높을수록 느린 구간입니다. 어떤 키 전환이 흐름을 막는지 직관적으로 파악하세요."}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.6rem",
            }}
          >
            {(isEn
              ? ["Slow transition highlight", "Per-finger load view", "Live updates as you type"]
              : ["느린 키 전환 하이라이트", "손가락별 부하 보기", "타이핑 중 실시간 업데이트"]
            ).map((item) => (
              <span key={item} className="landing-pill">
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
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-inset)",
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

      {/* ===== 6. Practice Modes ===== */}
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
              ? "Start typing. TypeDiag will show you exactly where to improve."
              : "타이핑을 시작하세요. TypeDiag가 어디를 고쳐야 할지 정확히 알려드립니다."}
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
