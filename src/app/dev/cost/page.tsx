import { notFound } from "next/navigation";

import { DevUnitEconomicsPanel } from "@/components/dev/DevUnitEconomicsPanel";

import styles from "../dev.module.css";

export default function DevCostPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.inner} ${styles.innerWide}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dev · Unit Economics</h1>
          <p className={styles.subtitle}>
            비용(인프라·API)과 수익(Pro 구독·B2B)을 분리해 조정하고, Cloudflare·OCI→Hetzner 플랫폼
            스케일링과 월간 손익을 함께 봅니다.
          </p>
        </header>
        <DevUnitEconomicsPanel />
      </div>
    </div>
  );
}
