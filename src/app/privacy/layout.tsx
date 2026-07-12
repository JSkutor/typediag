import type { Metadata } from "next";
import { getPrivacyMetadata } from "@/lib/i18n/legal/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const meta = getPrivacyMetadata("ko");

  return {
    title: meta.title,
    description: meta.description,
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
