import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SUPPORTED_LANGS, isValidLang } from "@/lib/i18n/lang";
import { getLandingCopy } from "@/lib/i18n/landing";

type Params = Promise<{ lang: string }>;

export function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLang(lang)) {
    return {};
  }
  const copy = getLandingCopy(lang);
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: {
      languages: {
        ko: "/ko",
        en: "/en",
      },
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { lang } = await params;
  if (!isValidLang(lang)) {
    notFound();
  }
  return children;
}
