import type { Metadata } from "next";
import { getTermsMetadata } from "@/lib/i18n/legal/terms";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getTermsMetadata("ko");

  return {
    title: meta.title,
    description: meta.description,
  };
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
