import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { TermsContent } from "@/components/legal/TermsContent";
import { getTermsDocument } from "@/lib/i18n/legal/terms";

export default function TermsPage() {
  const lang = "ko";
  const legalDocument = getTermsDocument(lang);

  return (
    <LegalDocumentLayout legalDocument={legalDocument}>
      <TermsContent lang={lang} />
    </LegalDocumentLayout>
  );
}
