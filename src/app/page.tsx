import Link from "next/link";
import styles from "./page.module.css";

const FEATURES = [
  {
    title: "원시 타건 캡처",
    body: "한글 IME 조합에 의존하지 않고 keydown·keyup 물리 이벤트를 직접 측정해 키 간 지연을 정확히 기록합니다.",
  },
  {
    title: "공간 타건 동역학",
    body: "Delaunay 삼각분할과 라플라시안 평활화로 키보드 좌표 위 타건 난이도를 부드럽게 보간합니다.",
  },
  {
    title: "100% 클라이언트",
    body: "로그인 없이 브라우저 안에서 모든 연산이 끝납니다. 데이터는 당신의 기기를 떠나지 않습니다.",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.badge}>SKDM · Spatial Keystroke Dynamics</span>
        <h1 className={styles.title}>
          당신의 손가락이 어디서
          <br />
          <span className={styles.accent}>망설이는지</span> 측정합니다
        </h1>
        <p className={styles.subtitle}>
          밀리초 단위의 물리적 타건 데이터를 수집하고, 공간 동역학 모델로
          키보드 위 약점을 시각화하는 차세대 타자연습 플랫폼.
        </p>
        <div className={styles.actions}>
          <Link href="/ko" className={styles.primary}>
            연습 시작
          </Link>
          <Link href="/dashboard" className={styles.secondary}>
            대시보드 보기
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        {FEATURES.map((f) => (
          <article key={f.title} className={styles.card}>
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardBody}>{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
