"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import styles from "./AuthControls.module.css";

type AuthControlsProps = {
  variant?: "header" | "compact";
};

export function AuthControls({ variant = "header" }: AuthControlsProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const rootClass = variant === "compact" ? styles.compact : styles.header;

  if (!isLoaded) {
    return <div className={rootClass} aria-hidden="true" />;
  }

  return (
    <div className={rootClass} data-testid="auth-controls">
      {isSignedIn ? (
        <UserButton
          appearance={{
            elements: {
              avatarBox: {
                width: variant === "compact" ? 32 : 36,
                height: variant === "compact" ? 32 : 36,
              },
            },
          }}
        />
      ) : (
        <>
          <SignInButton mode="redirect">
            <button type="button" className={styles.signInBtn}>
              로그인
            </button>
          </SignInButton>
          {variant === "header" && (
            <SignUpButton mode="redirect">
              <button type="button" className={styles.signUpBtn}>
                회원가입
              </button>
            </SignUpButton>
          )}
        </>
      )}
    </div>
  );
}
