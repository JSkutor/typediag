import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { ClerkErrorHandler } from "@/components/auth/ClerkErrorHandler";
import { UserSyncEffect } from "@/components/auth/UserSyncEffect";
import { getLandingCopy } from "@/lib/i18n/landing";

import { clerkAppearance } from "@/lib/clerkAppearance";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const copy = getLandingCopy("ko");

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: copy.meta.title,
  description: copy.meta.description,
  alternates: {
    canonical: `/`,
  },
  openGraph: {
    title: copy.meta.title,
    description: copy.meta.description,
    url: `${baseUrl}/`,
    siteName: "TypeDiag",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: copy.meta.title,
    description: copy.meta.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/">
      <html
        lang="ko"
        suppressHydrationWarning
        className={`${outfit.variable} ${firaCode.variable}`}
      >
        <body>
          <ClerkErrorHandler />
          <UserSyncEffect />
          <main>{children}</main>
          <ConditionalFooter />
        </body>
      </html>
    </ClerkProvider>
  );
}
