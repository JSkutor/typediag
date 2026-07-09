import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { EN_PUBLIC_ENABLED, getPublicLangs, isPublicLangRoute, isValidLang } from "@/lib/i18n/lang";
import { getLandingCopy } from "@/lib/i18n/landing";

type Params = Promise<{ lang: string }>;

export function generateStaticParams() {
  return getPublicLangs().map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLang(lang)) {
    return {};
  }
  const copy = getLandingCopy(lang);

  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    return "http://localhost:3000";
  };

  const baseUrl = getBaseUrl();

  return {
    metadataBase: new URL(baseUrl),
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: EN_PUBLIC_ENABLED
        ? {
            ko: "/ko",
            en: "/en",
          }
        : {
            ko: "/ko",
          },
    },
    openGraph: {
      title: copy.meta.title,
      description: copy.meta.description,
      url: `${baseUrl}/${lang}`,
      siteName: "TypeDiag",
      locale: lang === "ko" ? "ko_KR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: copy.meta.title,
      description: copy.meta.description,
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
  if (!isPublicLangRoute(lang)) {
    redirect("/ko");
  }
  return children;
}
