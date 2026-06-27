"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { LegalDashboardIconSvg } from "@/components/legal/LegalDashboardIcon";
import type { LegalDocumentCopy } from "@/lib/i18n/legal/types";
import "@/app/styles/legal-page.css";

interface LegalDocumentLayoutProps {
  legalDocument: LegalDocumentCopy;
  children: ReactNode;
}

export function LegalDocumentLayout({ legalDocument, children }: LegalDocumentLayoutProps) {
  const { sections, dashboardCards, dashboardIcon, dashboardTitle, title, subtitle, tocLabel } =
    legalDocument;

  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const sectionElements = sections
      .map((section) => container.querySelector<HTMLElement>(`#${CSS.escape(section.id)}`))
      .filter((element): element is HTMLElement => element != null);

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
          return;
        }

        const scrollBottom = window.scrollY + window.innerHeight;
        const pageBottom = window.document.documentElement.scrollHeight;
        const lastSectionId = sections[sections.length - 1]?.id;
        if (lastSectionId && pageBottom - scrollBottom < 48) {
          setActiveSection(lastSectionId);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    sectionElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="landing-page">
      <Header />

      <main className="legal-page">
        <header className="legal-header">
          <h1 className="legal-title">{title}</h1>
          <p className="legal-subtitle">{subtitle}</p>
        </header>

        <section className="legal-dashboard">
          <h2 className="dashboard-title">
            <LegalDashboardIconSvg icon={dashboardIcon} />
            {dashboardTitle}
          </h2>
          <div className="dashboard-grid">
            {dashboardCards.map((card) => (
              <div key={card.label} className="dashboard-card">
                <div className="card-icon">
                  <LegalDashboardIconSvg icon={card.icon} />
                </div>
                <span className="card-label">{card.label}</span>
                <span className="card-value">{card.value}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="legal-layout">
          <aside className="legal-sidebar">
            <h3 className="sidebar-title">{tocLabel}</h3>
            <ul className="sidebar-menu">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className={`sidebar-item ${activeSection === section.id ? "active" : ""}`}
                >
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="legal-content" ref={contentRef}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
