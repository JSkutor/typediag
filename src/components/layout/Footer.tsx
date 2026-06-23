import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copy}>TypeDiag — Spatial Keystroke Dynamics</span>
        <span className={styles.meta}>
          Sessions saved to cloud · Guest &amp; signed-in · {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
