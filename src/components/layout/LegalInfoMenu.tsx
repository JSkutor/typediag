"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isValidLang, type LandingLang } from "@/lib/i18n/lang";
import { getLandingCopy } from "@/lib/i18n/landing";

interface LegalInfoMenuProps {
  lang: string;
}

export function LegalInfoMenu({ lang }: LegalInfoMenuProps) {
  const landingLang: LandingLang = isValidLang(lang) ? lang : "ko";
  const footer = getLandingCopy(landingLang).footer;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="legal-info-menu" ref={rootRef}>
      <button
        type="button"
        className="legal-info-btn"
        aria-label={landingLang === "ko" ? "법적 정보" : "Legal information"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
      >
        i
      </button>
      {open ? (
        <ul className="legal-info-dropdown" role="menu">
          <li role="none">
            <Link href={`/${landingLang}/terms`} role="menuitem" onClick={() => setOpen(false)}>
              {footer.terms}
            </Link>
          </li>
          <li role="none">
            <Link href={`/${landingLang}/privacy`} role="menuitem" onClick={() => setOpen(false)}>
              {footer.privacy}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
