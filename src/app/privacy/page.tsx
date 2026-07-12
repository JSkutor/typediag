import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { getPrivacyDocument } from "@/lib/i18n/legal/privacy";

export default function PrivacyPage() {
  const lang = "ko";
  const legalDocument = getPrivacyDocument(lang);

  return (
    <LegalDocumentLayout legalDocument={legalDocument}>
      <PrivacyContent lang={lang} />
    </LegalDocumentLayout>
  );
}
