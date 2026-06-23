"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthControls } from "@/components/auth/AuthControls";
import styles from "./Header.module.css";

export function Header() {
  const params = useParams();
  const lang = (params?.lang as string) || "ko";
  const isEn = lang === "en";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${lang}`} className={styles.brand} aria-label="TypeDiag home">
          <span className={styles.keycap}>T</span>
          <span className={styles.wordmark}>
            Type<span className={styles.accent}>Diag</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <Link href={`/${lang}/practice`} className={styles.navLink}>
            {isEn ? "Practice" : "연습"}
          </Link>
          <Link href={`/${lang}/practice?tab=dashboard`} className={styles.navLink}>
            {isEn ? "Dashboard" : "대시보드"}
          </Link>
          <Link href={`/${lang}/practice`} className={styles.cta}>
            {isEn ? "Get Started" : "시작하기"}
          </Link>
          <AuthControls />
        </nav>
      </div>
    </header>
  );
}

