"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthControls } from "@/components/auth/AuthControls";
import { isValidLang } from "@/lib/i18n/lang";
import { getLandingCopy } from "@/lib/i18n/landing";
import styles from "./Header.module.css";

export function Header() {
  const params = useParams();
  const rawLang = params?.lang;
  const lang = typeof rawLang === "string" && isValidLang(rawLang) ? rawLang : "ko";
  const nav = getLandingCopy(lang).nav;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="TypeDiag home">
          <span className={styles.keycap}>T</span>
          <span className={styles.wordmark}>
            Type<span className={styles.accent}>Diag</span>
          </span>
          <span className={styles.betaBadge}>BETA</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <Link href="/practice" className={styles.cta}>
            {nav.getStarted}
          </Link>
          <AuthControls />
        </nav>
      </div>
    </header>
  );
}
