"use client";

import { getLandingCopy, type LandingLang } from "@/lib/i18n/landing";
import { RevealOnScroll } from "./RevealOnScroll";
import { DiagnosisBarFill } from "./DiagnosisBarFill";

interface DiagnosisPreviewProps {
  lang: LandingLang;
}

export function DiagnosisPreview({ lang }: DiagnosisPreviewProps) {
  const t = getLandingCopy(lang).diagnosis;

  return (
    <section className="diagnosis-preview-section">
      <div className="diagnosis-preview-inner">
        <RevealOnScroll className="section-header" initialY={20} duration={0.6}>
          <p className="section-eyebrow">{t.eyebrow}</p>
          <h2 className="section-title">{t.title}</h2>
          <p className="section-subtitle">{t.subtitle}</p>

          <div className="diagnosis-dimensions">
            <span className="diagnosis-dimensions-label">{t.dimensionsLabel}</span>
            <div className="diagnosis-dimensions-pills">
              {t.dimensions.map((item) => (
                <span key={item} className="landing-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        <div className="diagnosis-compare-grid">
          <RevealOnScroll
            className="diagnosis-card diagnosis-card--before"
            initialX={-20}
            initialY={0}
          >
            <span className="diagnosis-card-label">{t.beforeLabel}</span>
            <div className="diagnosis-stat-row">
              <div className="diagnosis-stat">
                <span className="diagnosis-stat-value">{t.beforeValue}</span>
                <span className="diagnosis-stat-unit">{t.beforeUnit}</span>
              </div>
              <div className="diagnosis-stat">
                <span className="diagnosis-stat-value">96</span>
                <span className="diagnosis-stat-unit">%</span>
              </div>
            </div>
            <p className="diagnosis-card-note">{t.beforeNote}</p>
          </RevealOnScroll>

          <RevealOnScroll
            className="diagnosis-card diagnosis-card--after"
            initialX={20}
            initialY={0}
            delay={0.1}
          >
            <span className="diagnosis-card-label diagnosis-card-label--accent">
              {t.afterLabel}
            </span>

            <div className="diagnosis-highlight">
              <span className="diagnosis-highlight-key">
                {t.slowTransitions[0]?.pair || "R → T"}
              </span>
              <span className="diagnosis-highlight-ms">
                {t.slowTransitions[0]?.ms ? `${t.slowTransitions[0].ms}ms` : "340ms"}
              </span>
              <span className="diagnosis-highlight-tag">{t.bottleneck}</span>
            </div>

            <p className="diagnosis-insight">{t.insight}</p>

            <div className="diagnosis-bars">
              <p className="diagnosis-bars-title">{t.barsTitle}</p>
              {t.slowTransitions.map((row, i) => (
                <div key={row.pair} className="diagnosis-bar-row">
                  <span className="diagnosis-bar-pair">{row.pair}</span>
                  <div className="diagnosis-bar-track">
                    <DiagnosisBarFill widthPercent={row.bar} delay={0.2 + i * 0.08} />
                  </div>
                  <span className="diagnosis-bar-ms">{row.ms}ms</span>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
