import Link from "next/link";
import styles from "./ComingSoon.module.css";

interface ComingSoonProps {
  phase: string;
  title: string;
  description: string;
}

export function ComingSoon({ phase, title, description }: ComingSoonProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.phase}>{phase}</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.desc}>{description}</p>
      <Link href="/" className={styles.back}>
        ← 홈으로
      </Link>
    </div>
  );
}
