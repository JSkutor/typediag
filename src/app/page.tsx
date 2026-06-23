import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLangFromAcceptLanguage } from "@/lib/i18n/lang";

export default async function RootPage() {
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  const lang = resolveLangFromAcceptLanguage(acceptLanguage);
  redirect(`/${lang}`);
}
