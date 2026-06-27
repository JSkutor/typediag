import { notFound } from "next/navigation";
import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { isValidLang, type LandingLang } from "@/lib/i18n/lang";
import { getPrivacyDocument } from "@/lib/i18n/legal/privacy";

type Params = Promise<{ lang: string }>;

export default async function PrivacyPage({ params }: { params: Params }) {
  const { lang: rawLang } = await params;

  if (!isValidLang(rawLang)) {
    notFound();
  }

  const lang = rawLang as LandingLang;
  const legalDocument = getPrivacyDocument(lang);

  return (
    <LegalDocumentLayout legalDocument={legalDocument}>
      <PrivacyContent lang={lang} />
    </LegalDocumentLayout>
  );
}
