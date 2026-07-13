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
          <a
            href="https://github.com/JSkutor/typediag"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
            aria-label="GitHub Repository"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 6 }}
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-8.3 0-1.9-.7-3.4-1.9-4.5.2-.5.8-2.1-.2-4.4 0 0-1.5-.5-5 1.8-1.4-.4-3-.6-4.6-.6-1.6 0-3.2.2-4.6.6-3.5-2.3-5-1.8-5-1.8-1 2.3-.4 3.9-.2 4.4-1.2 1.1-1.9 2.6-1.9 4.5 0 6.8 3 8 6 8.3-.6.5-1.1 1.4-1.3 2.7-.2.1-.6.3-1.6.3-1.4 0-2.5-.9-3.2-2.3-.6-1.1-1.8-1.5-1.8-1.5-.9-.1-.2.4-.2.4.9.4 1.4 1.7 1.4 1.7.8 1.5 2.6 2 3.8 2 1.2 0 1.9-.3 1.9-.3" />
            </svg>
            GitHub
          </a>
        </div>
        <span className={styles.meta}>
          Sessions saved to cloud · Guest &amp; signed-in · {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
