import { getLandingCopy, type LandingLang } from "@/lib/i18n/landing";
import { RevealOnScroll } from "./RevealOnScroll";

interface ProblemSectionProps {
  lang: LandingLang;
}

export function ProblemSection({ lang }: ProblemSectionProps) {
  const t = getLandingCopy(lang).problem;

  return (
    <section className="problem-section">
      <div className="problem-inner">
        <RevealOnScroll className="section-header" initialY={20} duration={0.6}>
          <p className="section-eyebrow">{t.eyebrow}</p>
          <h2 className="section-title">{t.title}</h2>
          <p className="section-subtitle">{t.subtitle}</p>
        </RevealOnScroll>

        <div className="problem-grid">
          {t.pains.map((pain, i) => (
            <RevealOnScroll key={pain.quote} className="problem-card" delay={i * 0.1}>
              <p className="problem-quote">{pain.quote}</p>
              <p className="problem-detail">{pain.detail}</p>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
