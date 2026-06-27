import type { Metadata } from "next";
import { isValidLang, type LandingLang } from "@/lib/i18n/lang";
import { getTermsMetadata } from "@/lib/i18n/legal/terms";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  if (!isValidLang(rawLang)) {
    return {};
  }

  const lang = rawLang as LandingLang;
  const meta = getTermsMetadata(lang);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      languages: {
        ko: "/ko/terms",
        en: "/en/terms",
      },
    },
  };
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
