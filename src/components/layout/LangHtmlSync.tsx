"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { isValidLang } from "@/lib/i18n/lang";

/** Keeps document.documentElement.lang in sync with the [lang] route segment. */
export function LangHtmlSync() {
  const params = useParams();
  const raw = params?.lang;

  useEffect(() => {
    if (typeof raw === "string" && isValidLang(raw)) {
      document.documentElement.lang = raw;
    }
  }, [raw]);

  return null;
}
