import type { LandingLang } from "../lang";

export type LegalDashboardIcon =
  | "document"
  | "grid"
  | "check"
  | "globe"
  | "lock"
  | "package"
  | "user"
  | "clock"
  | "shield";

interface LegalSection {
  id: string;
  title: string;
}

interface LegalDashboardCard {
  icon: LegalDashboardIcon;
  label: string;
  value: string;
}

export interface LegalDocumentCopy {
  meta: {
    title: string;
    description: string;
  };
  title: string;
  subtitle: string;
  dashboardTitle: string;
  dashboardIcon: LegalDashboardIcon;
  tocLabel: string;
  sections: LegalSection[];
  dashboardCards: LegalDashboardCard[];
}

export type LegalDocumentByLang = Record<LandingLang, LegalDocumentCopy>;
