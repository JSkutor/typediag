import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./dev.module.css";

const DEV_TOOLS = [
  {
    href: "/dev/cosine",
    title: "Cosine Similarity",
    description: "Subject Mode 시맨틱 검색. DB 유사도 상위 문장 조회.",
  },
  {
    href: "/dev/piecewise",
    title: "Piecewise Regression",
    description: "Zustand analysisEvents 기반 분절 회귀 시각화.",
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
