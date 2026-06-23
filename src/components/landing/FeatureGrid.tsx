import type { CSSProperties } from "react";
import { getLandingCopy, type LandingLang } from "@/lib/i18n/landing";
import { RevealOnScroll } from "./RevealOnScroll";

interface FeatureGridProps {
  lang: LandingLang;
}

const FEATURE_ICONS = [
  (
    <svg
      key="topic"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  (
    <svg
      key="hardcore"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  (
    <svg
      key="guest"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  (
    <svg
      key="live"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
];

const FEATURE_ACCENTS = [
  "var(--accent-secondary)",
  "var(--error)",
  "var(--success)",
  "var(--accent)",
];

export function FeatureGrid({ lang }: FeatureGridProps) {
  const t = getLandingCopy(lang).features;

  return (
    <section className="feature-grid-section">
      <div className="feature-grid-inner">
        <RevealOnScroll className="section-header" initialY={20} duration={0.6}>
          <p className="section-eyebrow">{t.eyebrow}</p>
          <h2 className="section-title">{t.title}</h2>
          <p className="section-subtitle">{t.subtitle}</p>
        </RevealOnScroll>

        <div className="feature-grid feature-grid--quad">
          {t.items.map((feature, i) => {
            const accentColor = FEATURE_ACCENTS[i] ?? "var(--accent)";
            return (
              <RevealOnScroll
                key={feature.title}
                className="feature-card"
                style={{ "--feature-accent": accentColor } as CSSProperties}
                delay={i * 0.07}
                whileHover={{ y: -4 }}
              >
                <div
                  className="feature-icon"
                  style={{
                    background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                    color: accentColor,
                    border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
                  }}
                >
                  {FEATURE_ICONS[i]}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
