import { notFound } from "next/navigation";

import { DevCloudTypingPanel } from "@/components/dev/DevCloudTypingPanel";

import styles from "../dev.module.css";

export default function DevCloudTypingPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.inner} ${styles.innerWide}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dev · Cloud Typing Scatter</h1>
          <p className={styles.subtitle}>
            Zustand <code>analysisEvents</code>에서 focusKey outgoing transition 기준 쌍의
            (reference holdDurationMs, outgoing latencyMs)를 좌표평면에 표시합니다.
            development 모드에서만 접근 가능합니다.
          </p>
        </header>
        <DevCloudTypingPanel />
      </div>
    </div>
  );
}
