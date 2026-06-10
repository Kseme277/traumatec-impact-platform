import { Link } from "react-router";
import { useTranslation } from "../../i18n/useTranslation";

export default function LandingHero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden pt-16 dark:bg-gray-900">
      <div className="landing-wrapper relative">
        <div className="mx-auto max-w-3xl pb-16 text-center">
          <span className="mb-4 inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
            {t("landing.hero.badge")}
          </span>
          <h1 className="mx-auto mb-4 max-w-2xl text-4xl font-bold text-gray-800 dark:text-white/90 sm:text-[50px] sm:leading-[64px]">
            {t("landing.hero.title")}
          </h1>
          <p className="mx-auto max-w-xl text-base text-gray-500 dark:text-gray-400">
            {t("landing.hero.subtitle")}
          </p>
          <div className="relative z-30 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signin"
              className="inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-6 text-sm text-white transition hover:bg-brand-600"
            >
              {t("landing.hero.ctaPrimary")}
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t("landing.hero.ctaSecondary")}
            </a>
          </div>
        </div>

        <div className="relative z-20 mx-auto max-w-[1000px]">
          <div className="relative z-30 rounded-[32px] border border-white/30 bg-white/20 p-3 dark:border-white/10 sm:p-[18px]">
            <img
              src="/images/landing/hero-img.jpg"
              alt=""
              className="block w-full rounded-2xl dark:hidden"
              width={966}
              height={552}
            />
            <img
              src="/images/landing/hero-img-dark.png"
              alt=""
              className="hidden w-full rounded-2xl dark:block"
              width={966}
              height={552}
            />
          </div>
          <div className="pointer-events-none absolute -top-20 left-1/2 hidden -translate-x-1/2 -translate-y-20 lg:block">
            <svg width="1300" height="1001" viewBox="0 0 1300 1001" fill="none" aria-hidden="true">
              <g opacity="0.5" filter="url(#hero-glow-a)">
                <circle cx="800" cy="500" r="300" fill="#465fff" />
              </g>
              <g opacity="0.25" filter="url(#hero-glow-b)">
                <circle cx="500" cy="500" r="300" fill="#7592ff" />
              </g>
              <defs>
                <filter id="hero-glow-a" x="300" y="0" width="1000" height="1000" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="100" />
                </filter>
                <filter id="hero-glow-b" x="0" y="0" width="1000" height="1000" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="100" />
                </filter>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      <div className="landing-hero-glow pointer-events-none absolute bottom-0 z-10 h-40 w-full" />
    </section>
  );
}
