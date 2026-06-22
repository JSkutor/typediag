import { notFound } from "next/navigation";

import { DevPiecewisePanel } from "@/components/dev/DevPiecewisePanel";

import styles from "../dev.module.css";

export default function DevPiecewisePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dev · Piecewise Regression</h1>
          <p className={styles.subtitle}>
            Zustand <code>analysisEvents</code>를 사용합니다. toKey 드롭다운으로 대상 키를 선택해
            분절 회귀를 시각화합니다. development 모드에서만 접근 가능합니다.
          </p>
        </header>
        <DevPiecewisePanel />
      </div>
    </div>
  );
}
