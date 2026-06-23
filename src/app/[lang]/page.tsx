import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { LandingSurface3D } from "@/components/landing/LandingSurface3D";
import { LandingCylindrical3D } from "@/components/landing/LandingCylindrical3D";
import { StatsCards } from "@/components/landing/StatsCards";

type Params = Promise<{ lang: string }>;

export default async function LangLandingPage({ params }: { params: Params }) {
  const { lang } = await params;
  const isEn = lang === "en";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-base, #1a1b1e)",
        color: "var(--text-primary, #e4e6eb)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, sans-serif)",
        overflowX: "hidden",
      }}
    >
      <Header />

      {/* 1. Hero Section */}
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

        {/* Hero Content Overlay */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            pointerEvents: "none",
            padding: "0 2rem",
            background:
              "radial-gradient(circle at 50% 55%, rgba(26,27,30,0.55) 0%, rgba(26,27,30,0) 68%)",
            maxWidth: "780px",
          }}
        >
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--accent, #3861fb)",
              marginBottom: "1rem",
              opacity: 0.9,
            }}
          >
            SKDM — Spatial Keystroke Dynamics Model
          </p>
          <h1
            style={{
              fontSize: "clamp(2.8rem, 7.5vw, 5.5rem)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
              background: "linear-gradient(175deg, #ffffff 0%, #a1a1aa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {isEn ? (
              <>
                Spatial Keystroke
                <br />
                Dynamics
              </>
            ) : (
              <>
                공간 타건 진단
                <br />
                다이내믹스
              </>
            )}
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary, #9ba1a6)",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
              maxWidth: "560px",
              margin: "0 auto 2.5rem auto",
            }}
          >
            {isEn
              ? "Not just another WPM test. We map your typing bottlenecks in a 3D spatial landscape to diagnose the root cause of typos."
              : "단순한 타자 연습기가 아닙니다. 키보드 3D 공간 상에 지연 지형을 생성하여 오타와 병목의 근본 원인을 진단합니다."}
          </p>
          <div style={{ pointerEvents: "auto" }}>
            <Link href={`/${lang}/practice`} className="hero-start-button">
              {isEn ? "Start Diagnostics" : "진단 시작하기"}
            </Link>
          </div>
        </div>

        {/* Bottom fade to smooth transition */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "220px",
            background:
              "linear-gradient(to bottom, transparent 0%, var(--bg-base, #1a1b1e) 100%)",
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
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(155, 161, 166, 0.6)",
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
            stroke="rgba(155,161,166,0.6)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* 2. Cylindrical Vector Section */}
      <section
        style={{
          position: "relative",
          width: "100%",
          padding: "6rem 8%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          gap: "4rem",
          backgroundColor: "var(--bg-base)",
        }}
        className="landing-cylindrical-section"
      >
        <div style={{ zIndex: 10 }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent, #3861fb)",
              marginBottom: "0.75rem",
            }}
          >
            {isEn ? "Analysis" : "분석 방법론"}
          </p>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 700,
              marginBottom: "1.25rem",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            {isEn ? "Vector Flow Analysis" : "벡터 흐름 분석"}
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-secondary)",
              lineHeight: 1.75,
              marginBottom: "2rem",
            }}
          >
            {isEn
              ? "Every keystroke combination is mapped onto a cylindrical coordinate system. Visualize exactly which transitions are causing you to slow down."
              : "모든 키 입력 조합을 원통형 좌표계에 매핑합니다. 어떤 키 조합에서 지연이 발생하는지 정확하게 시각화하여 파악하세요."}
          </p>
          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {(isEn
              ? ["Cylindrical coordinate mapping", "Real-time vector rendering", "Bottleneck key highlighting"]
              : ["원통형 좌표 매핑", "실시간 벡터 렌더링", "병목 키 하이라이팅"]
            ).map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--accent, #3861fb)",
                    flexShrink: 0,
                  }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            height: "540px",
            position: "relative",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(15,16,20,0.6)",
          }}
        >
          {/* Faded edges */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxShadow: "inset 0 0 40px 15px rgba(26,27,30,0.95)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          />
          <LandingCylindrical3D />
        </div>
      </section>

      {/* 3. Stats Section */}
      <section
        style={{
          position: "relative",
          width: "100%",
          padding: "7rem 0 8rem",
          backgroundColor: "var(--bg-base)",
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
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent, #3861fb)",
              marginBottom: "0.75rem",
            }}
          >
            {isEn ? "Under the hood" : "내부 알고리즘"}
          </p>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              color: "var(--text-primary)",
            }}
          >
            {isEn ? "Deep Diagnostics" : "심층 진단 알고리즘"}
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-secondary)",
              maxWidth: "580px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            {isEn
              ? "Beyond WPM: We use advanced statistical modeling to find exactly where you hesitate."
              : "WPM을 넘어서: 고급 통계 모델링으로 당신이 주저하는 지점을 정확히 찾아냅니다."}
          </p>
        </div>
        <StatsCards isEn={isEn} />
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "2rem",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "var(--text-tertiary, #687076)",
          fontSize: "0.875rem",
        }}
      >
        &copy; {new Date().getFullYear()} TypeDiag. All rights reserved.
      </footer>
    </div>
  );
}
