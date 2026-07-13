import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import styles from "@/components/auth/AuthPage.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
        <Link href="/" className={styles.backLink}>
          연습으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
