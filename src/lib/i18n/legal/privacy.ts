import type { LandingLang } from "../lang";
import type { LegalDocumentByLang, LegalDocumentCopy } from "./types";

const PRIVACY: LegalDocumentByLang = {
  ko: {
    meta: {
      title: "개인정보 처리방침 — TypeDiag",
      description:
        "TypeDiag 개인정보 처리방침. 수집 항목, 보유 기간, 가명처리, OpenAI·Clerk 위탁 및 정보주체 권리를 안내합니다.",
    },
    title: "개인정보 처리방침",
    subtitle:
      "TypeDiag 서비스의 개인정보 처리 기준 및 보호 조치를 투명하게 안내해 드립니다.",
    dashboardTitle: "핵심 개인정보 처리 요약",
    dashboardIcon: "grid",
    tocLabel: "목차",
    sections: [
      { id: "sec-1", title: "1. 개인정보의 처리 목적" },
      { id: "sec-2", title: "2. 처리하는 개인정보의 항목" },
      { id: "sec-3", title: "3. 타건 데이터 가명처리 및 연구 활용" },
      { id: "sec-4", title: "4. 개인정보의 처리 및 보유 기간" },
      { id: "sec-5", title: "5. 개인정보의 파기 절차 및 방법" },
      { id: "sec-6", title: "6. 개인정보처리의 위탁 및 국외이전" },
      { id: "sec-7", title: "7. 생성형 AI 서비스 개인정보 처리" },
      { id: "sec-8", title: "8. 정보주체와 법정대리인의 권리·의무" },
      { id: "sec-9", title: "9. 개인정보의 안전성 확보조치" },
      { id: "sec-10", title: "10. 개인정보 보호책임자 및 권익침해 구제" },
      { id: "sec-11", title: "11. 개인정보 처리방침의 변경" },
    ],
    dashboardCards: [
      {
        icon: "user",
        label: "수집하는 개인정보",
        value: "Clerk ID, 이메일, 이름, Guest UUID, 타건 키 이벤트",
      },
      {
        icon: "clock",
        label: "보유 및 파기",
        value: "회원 탈퇴 시 즉시 파기 (타건 분석용 데이터는 가명처리 보관)",
      },
      {
        icon: "package",
        label: "제3자 제공 및 위탁",
        value: "OpenAI API 위탁 (Zero Data Retention 계약 적용, AI 학습에 미활용)",
      },
      {
        icon: "shield",
        label: "가명정보 연구 활용",
        value: "Clerk ID에 단방향 Secret Salt를 결합하여 완벽한 재식별 차단 조치 수행",
      },
    ],
  },
  en: {
    meta: {
      title: "Privacy Policy — TypeDiag",
      description:
        "TypeDiag Privacy Policy covering data collection, retention, pseudonymization, OpenAI/Clerk entrustment, and data subject rights.",
    },
    title: "Privacy Policy",
    subtitle:
      "We transparently guide you through the privacy policy and data protection measures of TypeDiag.",
    dashboardTitle: "Key Privacy Summary",
    dashboardIcon: "grid",
    tocLabel: "Table of Contents",
    sections: [
      { id: "sec-1", title: "1. Purpose of Processing" },
      { id: "sec-2", title: "2. Categories of Personal Data" },
      { id: "sec-3", title: "3. Keystroke Dynamics Pseudonymization" },
      { id: "sec-4", title: "4. Retention and Processing Period" },
      { id: "sec-5", title: "5. Destruction Procedures and Methods" },
      { id: "sec-6", title: "6. Entrustment and Overseas Transfer" },
      { id: "sec-7", title: "7. Generative AI Service Data Handling" },
      { id: "sec-8", title: "8. Rights and Obligations of Data Subjects" },
      { id: "sec-9", title: "9. Measures to Ensure Data Safety" },
      { id: "sec-10", title: "10. Chief Privacy Officer and Remedies" },
      { id: "sec-11", title: "11. Amendments to the Privacy Policy" },
    ],
    dashboardCards: [
      {
        icon: "user",
        label: "Collected Data",
        value: "Clerk ID, Email, Name, Guest UUID, Keystroke events",
      },
      {
        icon: "clock",
        label: "Retention & Destruction",
        value: "Immediate destruction on withdrawal (Keystroke research data is pseudonymized)",
      },
      {
        icon: "package",
        label: "3rd Party & Entrustment",
        value: "Entrusted to OpenAI (Zero Data Retention, not used for AI training)",
      },
      {
        icon: "shield",
        label: "Research Pseudonymization",
        value: "One-way Secret Salt hash on Clerk ID to prevent user re-identification",
      },
    ],
  },
};

export function getPrivacyDocument(lang: LandingLang): LegalDocumentCopy {
  return PRIVACY[lang];
}

export function getPrivacyMetadata(lang: LandingLang) {
  return PRIVACY[lang].meta;
}
