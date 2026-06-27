import type { Metadata } from "next";
import { isValidLang, type LandingLang } from "@/lib/i18n/lang";
import { getPrivacyMetadata } from "@/lib/i18n/legal/privacy";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  if (!isValidLang(rawLang)) {
    return {};
  }

  const lang = rawLang as LandingLang;
  const meta = getPrivacyMetadata(lang);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      languages: {
        ko: "/ko/privacy",
        en: "/en/privacy",
      },
    },
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
