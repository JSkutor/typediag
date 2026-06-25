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
          <h1 className={styles.title}>Dev · Cloud Typing (구름타법)</h1>
          <p className={styles.subtitle}>
            Cylindrical Diagnostics §2.1 분석 풀 + dev ND 식{" "}
            <code>|L−D|/max(L+D, M)</code> 산점도·구름 음영(ND ≤ 0.25). development 모드에서만
            접근 가능합니다.
          </p>
        </header>
        <DevCloudTypingPanel />
      </div>
    </div>
  );
}
