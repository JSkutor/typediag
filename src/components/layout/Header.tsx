import Link from "next/link";
import { AuthControls } from "@/components/auth/AuthControls";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="TypeDiag home">
          <span className={styles.keycap}>T</span>
          <span className={styles.wordmark}>
            Type<span className={styles.accent}>Diag</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <Link href="/ko" className={styles.navLink}>
            연습
          </Link>
          <Link href="/dashboard" className={styles.navLink}>
            대시보드
          </Link>
          <Link href="/ko" className={styles.cta}>
            시작하기
          </Link>
          <AuthControls />
        </nav>
      </div>
    </header>
  );
}
