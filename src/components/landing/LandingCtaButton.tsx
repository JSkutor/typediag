"use client";

import Link from "next/link";
import posthog from "posthog-js";
import type { LandingLang } from "@/lib/i18n/lang";
import { getLandingCopy } from "@/lib/i18n/landing";

interface LandingCtaButtonProps {
  lang: LandingLang;
  id?: string;
  className?: string;
}

function CtaArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function LandingCtaButton({
  lang,
  id,
  className = "hero-start-button",
}: LandingCtaButtonProps) {
  const label = getLandingCopy(lang).hero.cta;

  return (
    <Link
      href="/practice"
      className={className}
      id={id}
      onClick={() => posthog.capture("cta_clicked", { lang })}
    >
      {label}
      <CtaArrowIcon />
    </Link>
  );
}
