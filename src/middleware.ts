import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveLangFromAcceptLanguage } from "@/lib/i18n/lang";

export default clerkMiddleware((_auth, request: NextRequest) => {
  if (request.nextUrl.pathname === "/") {
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const lang = resolveLangFromAcceptLanguage(acceptLanguage);
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
