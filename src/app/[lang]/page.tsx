import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";

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
      }}
    >
      <Header />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1.5rem", fontWeight: 600 }}>
          {isEn ? "Welcome to TypeDiag" : "TypeDiag에 오신 것을 환영합니다"}
        </h1>
        <Link
          href={`/${lang}/practice`}
          style={{
            display: "inline-block",
            padding: "0.875rem 2.25rem",
            borderRadius: "var(--radius-lg, 16px)",
            backgroundColor: "var(--accent, #3861fb)",
            color: "var(--text-inverse, #f0f2f5)",
            fontWeight: 600,
            textDecoration: "none",
            transition: "background-color 0.2s ease",
          }}
        >
          {isEn ? "Start Practice" : "연습 시작하기"}
        </Link>
      </main>
    </div>
  );
}
