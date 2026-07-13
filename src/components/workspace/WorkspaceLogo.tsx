"use client";

import Link from "next/link";
import styles from "./WorkspaceLogo.module.css";

export function WorkspaceLogo() {
  return (
    <Link href="/" className={styles.workspaceLogo} aria-label="TypeDiag home">
      <span className={styles.wordmark}>TypeDiag</span>
      <span className={styles.betaBadge}>BETA</span>
    </Link>
  );
}
