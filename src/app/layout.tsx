import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";

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

export const metadata: Metadata = {
  title: "TypeDiag — 공간 타건 동역학 타자연습",
  description:
    "물리적 키 입력을 직접 캡처해 공간 타건 동역학(SKDM)으로 분석하는 차세대 타자연습 플랫폼.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${outfit.variable} ${firaCode.variable}`}>
      <body>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
