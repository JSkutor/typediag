import { notFound } from "next/navigation";

import styles from "../dev.module.css";

export default function DevThemesPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dev · Theme Playground</h1>
          <p className={styles.subtitle}>
            다크 그레이, 차콜 배경과 코드 하이라이트를 연상시키는 알록달록한 각인 색상 후보군을
            비교합니다. 직접 색상을 커스텀하고 내보낼 수 있습니다.
          </p>
        </header>
        <div>
          <p>Under construction: Theme Panel was removed.</p>
        </div>
      </div>
    </div>
  );
}
