import { Link } from "react-router";
import TipAnimatedLogo from "../../components/brand/TipAnimatedLogo";
import { useTranslation } from "../../i18n/useTranslation";

export default function LandingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gray-900">
      <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" aria-hidden="true">
        <svg width="1260" height="457" viewBox="0 0 1260 457" fill="none">
          <g filter="url(#footer-glow)">
            <circle cx="630" cy="-173" r="230" fill="#465fff" />
          </g>
          <defs>
            <filter id="footer-glow" x="0" y="-803" width="1260" height="1260" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="200" />
            </filter>
          </defs>
        </svg>
      </span>

      <div className="landing-wrapper relative z-10 py-16 xl:py-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link to="/" className="mb-6 inline-block">
              <TipAnimatedLogo size="md" variant="onDark" showWordmark showPlatformName animate />
            </Link>
            <p className="mb-6 max-w-sm text-sm text-gray-400">{t("landing.footer.description")}</p>
          </div>

          <div className="lg:col-span-4">
            <span className="mb-4 block text-sm text-gray-400">{t("landing.footer.platform")}</span>
            <nav className="flex flex-col gap-3">
              <a href="#features" className="text-sm text-gray-400 transition hover:text-white">
                {t("landing.nav.features")}
              </a>
              <a href="#modules" className="text-sm text-gray-400 transition hover:text-white">
                {t("landing.nav.modules")}
              </a>
              <a href="#faq" className="text-sm text-gray-400 transition hover:text-white">
                {t("landing.nav.faq")}
              </a>
            </nav>
          </div>

          <div className="lg:col-span-3">
            <span className="mb-4 block text-sm text-gray-400">{t("landing.footer.account")}</span>
            <nav className="flex flex-col gap-3">
              <Link to="/signin" className="text-sm text-gray-400 transition hover:text-white">
                {t("landing.nav.signIn")}
              </Link>
              <Link to="/reset-password" className="text-sm text-gray-400 transition hover:text-white">
                {t("landing.footer.resetPassword")}
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-gray-800">
        <div className="landing-wrapper py-5 text-center">
          <p className="text-sm text-gray-500">
            © {year} Traumatec Impact Platform — {t("landing.footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
