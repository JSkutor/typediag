import type { LandingLang } from "../lang";
import type { LegalDocumentByLang, LegalDocumentCopy } from "./types";

const TERMS: LegalDocumentByLang = {
  ko: {
    meta: {
      title: "서비스 이용약관 — TypeDiag",
      description:
        "TypeDiag 플랫폼 서비스 이용약관. 회원·게스트 이용 조건, 데이터 병합, 금지행위 및 지적재산권을 안내합니다.",
    },
    title: "서비스 이용약관",
    subtitle:
      "TypeDiag 플랫폼 서비스를 안전하고 편리하게 이용하기 위한 권리와 의무를 규정합니다.",
    dashboardTitle: "이용약관 핵심 요약",
    dashboardIcon: "document",
    tocLabel: "목차",
    sections: [
      { id: "sec-1", title: "1. 목적" },
      { id: "sec-2", title: "2. 정의" },
      { id: "sec-3", title: "3. 약관의 명시와 개정" },
      { id: "sec-4", title: "4. 서비스의 제공 및 변경" },
      { id: "sec-5", title: "5. 서비스의 중단 및 면책" },
      { id: "sec-6", title: "6. 회원가입 절차" },
      { id: "sec-7", title: "7. 회원 탈퇴 및 자격 상실" },
      { id: "sec-8", title: "8. 회원에 대한 통지" },
      { id: "sec-9", title: "9. 비회원 게스트 세션 및 데이터 병합" },
      { id: "sec-10", title: "10. 향후 유료 서비스 및 결제 원칙" },
      { id: "sec-11", title: "11. 개인정보보호" },
      { id: "sec-12", title: "12. 서비스 제공자의 의무" },
      { id: "sec-13", title: "13. 회원의 계정 관리 의무" },
      { id: "sec-14", title: "14. 이용자의 금지행위" },
      { id: "sec-15", title: "15. 저작권의 귀속 및 이용제한" },
      { id: "sec-16", title: "16. 분쟁해결 및 재판관할" },
    ],
    dashboardCards: [
      {
        icon: "check",
        label: "이용 대상 및 요금",
        value: "누구나 무료 이용 가능 (향후 Pro 구독 도입 시 별도 조항 적용)",
      },
      {
        icon: "globe",
        label: "비회원 데이터 병합",
        value: "로그인 시 비회원 타건 데이터가 회원 계정으로 안전하게 자동 병합",
      },
      {
        icon: "lock",
        label: "어뷰징 및 매크로 금지",
        value: "오토 타이핑 매크로, 데이터 비정상 조작 및 대량 API 호출 금지",
      },
      {
        icon: "package",
        label: "지적재산권 귀속",
        value: "3D 지연 지형(SKDM) 모델, 진단 알고리즘 및 UI 저작권은 TypeDiag 귀속",
      },
    ],
  },
  en: {
    meta: {
      title: "Terms of Service — TypeDiag",
      description:
        "TypeDiag Terms of Service covering membership, guest sessions, data merge, prohibited activities, and intellectual property.",
    },
    title: "Terms of Service",
    subtitle:
      "Defines the rights and obligations for using TypeDiag platform services safely and conveniently.",
    dashboardTitle: "Key Terms Summary",
    dashboardIcon: "document",
    tocLabel: "Table of Contents",
    sections: [
      { id: "sec-1", title: "1. Purpose" },
      { id: "sec-2", title: "2. Definitions" },
      { id: "sec-3", title: "3. Display & Amendment" },
      { id: "sec-4", title: "4. Provision & Modification" },
      { id: "sec-5", title: "5. Suspension & Limitation" },
      { id: "sec-6", title: "6. Membership Registration" },
      { id: "sec-7", title: "7. Withdrawal & Disqualification" },
      { id: "sec-8", title: "8. Notifications" },
      { id: "sec-9", title: "9. Guest Session & Data Merge" },
      { id: "sec-10", title: "10. Future Paid Plans & Payments" },
      { id: "sec-11", title: "11. Privacy Protection" },
      { id: "sec-12", title: "12. Provider's Obligations" },
      { id: "sec-13", title: "13. User Account Responsibilities" },
      { id: "sec-14", title: "14. Prohibited Activities" },
      { id: "sec-15", title: "15. Ownership of Intellectual Property" },
      { id: "sec-16", title: "16. Dispute Resolution" },
    ],
    dashboardCards: [
      {
        icon: "check",
        label: "Availability & Price",
        value: "Free for everyone (Specific terms apply if Pro plan is introduced)",
      },
      {
        icon: "globe",
        label: "Guest Data Merge",
        value: "Guest typing records automatically merged into member profile upon sign-in",
      },
      {
        icon: "lock",
        label: "Abuse & Macro Restriction",
        value: "Auto-typing macro, data manipulation, and massive API requests restricted",
      },
      {
        icon: "package",
        label: "Intellectual Property",
        value: "3D diagnostics (SKDM) model, algorithms, and UI are owned by TypeDiag",
      },
    ],
  },
};

export function getTermsDocument(lang: LandingLang): LegalDocumentCopy {
  return TERMS[lang];
}

export function getTermsMetadata(lang: LandingLang) {
  return TERMS[lang].meta;
}
