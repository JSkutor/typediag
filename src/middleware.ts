import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  EN_PUBLIC_ENABLED,
  getDefaultPublicLang,
  resolveLangFromAcceptLanguage,
} from "@/lib/i18n/lang";

export default clerkMiddleware((_auth, request: NextRequest) => {
  const { pathname, search } = request.nextUrl;

  if (!EN_PUBLIC_ENABLED && (pathname === "/en" || pathname.startsWith("/en/"))) {
    const rest = pathname.slice("/en".length);
    return NextResponse.redirect(new URL(`/ko${rest}${search}`, request.url));
  }

  if (pathname === "/") {
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const lang = EN_PUBLIC_ENABLED
      ? resolveLangFromAcceptLanguage(acceptLanguage)
      : getDefaultPublicLang();
    return NextResponse.redirect(new URL(`/${lang}${search}`, request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
