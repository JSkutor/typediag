import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.copy}>TypeDiag — Spatial Keystroke Dynamics</span>
          <a
            href="https://fairy.hada.io/@typediag"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.fairyLink}
          >
            🧚‍♀️ 개발자에게 커피 사주기
          </a>
        </div>
        <span className={styles.meta}>
          Sessions saved to cloud · Guest &amp; signed-in · {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
