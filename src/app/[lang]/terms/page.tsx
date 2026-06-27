import { notFound } from "next/navigation";
import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { TermsContent } from "@/components/legal/TermsContent";
import { isValidLang, type LandingLang } from "@/lib/i18n/lang";
import { getTermsDocument } from "@/lib/i18n/legal/terms";

type Params = Promise<{ lang: string }>;

export default async function TermsPage({ params }: { params: Params }) {
  const { lang: rawLang } = await params;

  if (!isValidLang(rawLang)) {
    notFound();
  }

  const lang = rawLang as LandingLang;
  const legalDocument = getTermsDocument(lang);

  return (
    <LegalDocumentLayout legalDocument={legalDocument}>
      <TermsContent lang={lang} />
    </LegalDocumentLayout>
  );
}
