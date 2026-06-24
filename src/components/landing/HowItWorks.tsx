import { getLandingCopy, type LandingLang } from "@/lib/i18n/landing";
import { RevealOnScroll } from "./RevealOnScroll";

interface HowItWorksProps {
  lang: LandingLang;
}

const STEP_ICONS = [
  <svg
    key="01"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
  </svg>,
  <svg
    key="02"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>,
  <svg
    key="03"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 22V12M12 12L5 7M12 12L19 7M5 7L12 2L19 7M5 7V17L12 22L19 17V7" />
  </svg>,
];

const STEP_ACCENTS = ["var(--accent)", "var(--accent-secondary)", "var(--error)"];

export function HowItWorks({ lang }: HowItWorksProps) {
  const t = getLandingCopy(lang).howItWorks;

  return (
    <section className="how-it-works-section">
      <div className="how-it-works-inner">
        <RevealOnScroll className="section-header" initialY={20} duration={0.6}>
          <p className="section-eyebrow">{t.eyebrow}</p>
          <h2 className="section-title">{t.title}</h2>
          <p className="section-subtitle">{t.subtitle}</p>
        </RevealOnScroll>

        <div className="how-it-works-steps">
          {t.steps.map((step, i) => {
            const accentColor = STEP_ACCENTS[i] ?? "var(--accent)";
            return (
              <RevealOnScroll key={step.num} className="hiw-step" initialY={32} delay={i * 0.12}>
                <div className="hiw-step-left">
                  <div
                    className="hiw-step-num"
                    style={{
                      color: accentColor,
                      borderColor: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
                    }}
                  >
                    {step.num}
                  </div>
                  {i < t.steps.length - 1 && <div className="hiw-connector" />}
                </div>

                <div className="hiw-step-content">
                  <div
                    className="hiw-icon"
                    style={{
                      background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                      color: accentColor,
                      border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
                    }}
                  >
                    {STEP_ICONS[i]}
                  </div>
                  <div>
                    <h3 className="hiw-step-title">{step.title}</h3>
                    <p className="hiw-step-desc">{step.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
