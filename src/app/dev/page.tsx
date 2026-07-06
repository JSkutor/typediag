import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./dev.module.css";

const DEV_TOOLS = [
  {
    href: "/dev/cost",
    title: "Unit Economics",
    description: "비용·수익 분리 시뮬레이션 및 월간 손익 추정.",
  },
  {
    href: "/dev/fixed",
    title: "Fixed Targets (10)",
    description: "고정된 타겟 문장 10개를 반복 연습하는 모드입니다.",
  },
  {
    href: "/dev/simulate",
    title: "MVSA Fuzz Simulator",
    description: "가상 유저로 무작위 오타를 발생시켜 MVSA 렌더링 엔진의 엣지 케이스를 검증합니다.",
  },
  {
    href: "/dev/cosine",
    title: "Cosine Similarity",
    description: "Topic Mode 시맨틱 검색. DB 유사도 상위 문장 조회.",
  },
  {
    href: "/dev/piecewise",
    title: "Piecewise Regression",
    description: "Zustand analysisEvents 기반 분절 회귀 시각화.",
  },
  {
    href: "/dev/cloud-typing",
    title: "Cloud Typing (구름타법)",
    description:
      "diag §2.1 분석 풀 + dev ND(|L−D|/max(L+D,M)) — 구름 비율·효과성 r, hold/latency 산점도.",
  },
  {
    href: "/dev/themes",
    title: "Theme Playground",
    description: "다크 그레이, 차콜 배경과 알록달록한 각인 색상 조합 테스트 베드.",
  },
] as const;

export default function DevPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dev Tools</h1>
          <p className={styles.subtitle}>development 모드에서만 접근 가능합니다.</p>
        </header>
        <ul className={styles.toolList}>
          {DEV_TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className={styles.toolCard}>
                <span className={styles.toolCardTitle}>{tool.title}</span>
                <span className={styles.toolCardDesc}>{tool.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
