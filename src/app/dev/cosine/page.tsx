import { notFound } from "next/navigation";

import { DevCosineSimilarityPanel } from "@/components/dev/DevCosineSimilarityPanel";

import styles from "../dev.module.css";

export default function DevCosinePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dev · Cosine Similarity</h1>
          <p className={styles.subtitle}>
            Subject Mode 시맨틱 검색을 Upstage 임베딩 + pgvector 코사인 유사도로 확인합니다.
            development 모드에서만 접근 가능합니다.
          </p>
        </header>
        <DevCosineSimilarityPanel />
      </div>
    </div>
  );
}
