import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import styles from "@/components/auth/AuthPage.module.css";

export default function SignInPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/ko" />
        <Link href="/ko" className={styles.backLink}>
          연습으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
