"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { shouldHideFooter } from "./conditionalFooterPaths";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (shouldHideFooter(pathname)) return null;
  return <Footer />;
}
