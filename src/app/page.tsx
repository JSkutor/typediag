import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { LandingSurface3D, LandingCylindrical3D } from "@/components/landing/Landing3DDynamic";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DiagnosisPreview } from "@/components/landing/DiagnosisPreview";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { LandingCtaButton } from "@/components/landing/LandingCtaButton";
import { getLandingCopy } from "@/lib/i18n/landing";

export default function LandingPage() {
  const lang = "ko";
  const t = getLandingCopy(lang);

  return (
    <div className="landing-page">
      <Header />

      <section className="hero-section">
        <div className="hero-surface-bg">
          <LandingSurface3D />
        </div>

        <div className="hero-vignette" />

        <div className="hero-content">
          <div className="hero-eyebrow-wrap">
            <span className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              {t.hero.eyebrow}
            </span>
          </div>

          <h1 className="hero-headline hero-headline--ko">
            <span className="hero-headline-line hero-headline-line--primary">
              {t.hero.headlinePrimary}
            </span>
            <span className="hero-headline-line hero-headline-line--accent">
              {t.hero.headlineAccent}
            </span>
          </h1>

          <p className="hero-subtitle">{t.hero.subtitle}</p>

          <div className="hero-cta-row hero-cta-row--interactive">
            <LandingCtaButton lang={lang} id="hero-cta-button" />
            <a href="#how-it-works" className="hero-secondary-link">
              {t.hero.secondaryLink}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </a>
          </div>
        </div>

        <div className="hero-bottom-fade" />

        <div className="scroll-indicator">
          <span className="scroll-indicator-label">{t.hero.scroll}</span>
          <svg
            className="scroll-chevron"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      <ProblemSection lang={lang} />

      <div id="how-it-works">
        <HowItWorks lang={lang} />
      </div>

      <DiagnosisPreview lang={lang} />

      <section className="landing-cylindrical-section">
        <div className="landing-cylindrical-copy">
          <p className="landing-cylindrical-eyebrow">{t.weaknessMap.eyebrow}</p>
          <h2 className="landing-cylindrical-title">{t.weaknessMap.title}</h2>
          <p className="landing-cylindrical-subtitle">{t.weaknessMap.subtitle}</p>

          <div className="landing-cylindrical-pills">
            {t.weaknessMap.pills.map((item) => (
              <span key={item} className="landing-pill">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="landing-cylindrical-visual">
          <div className="landing-cylindrical-visual__vignette" />
          <div className="landing-cylindrical-visual__canvas">
            <LandingCylindrical3D />
          </div>
        </div>
      </section>

      <FeatureGrid lang={lang} />

      <section className="cta-section">
        <div className="cta-inner">
          <p className="section-eyebrow">{t.cta.eyebrow}</p>
          <h2 className="cta-title">
            {t.cta.titleLine1}
            <br />
            {t.cta.titleLine2}
          </h2>
          <p className="cta-subtitle">{t.cta.subtitle}</p>

          <LandingCtaButton lang={lang} id="cta-final-button" />

          <p className="cta-note">{t.cta.note}</p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link href="/" className="landing-footer-logo">
            Type<span>Diag</span>
          </Link>
          <span className="landing-footer-copy">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </span>
          <nav className="landing-footer-links">
            <Link href="/practice">{t.footer.practice}</Link>
            <Link href="/terms">{t.footer.terms}</Link>
            <Link href="/privacy">{t.footer.privacy}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
