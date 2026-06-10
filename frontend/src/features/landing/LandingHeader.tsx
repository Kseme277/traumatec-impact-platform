import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import TipAnimatedLogo from "../../components/brand/TipAnimatedLogo";
import LanguageDropdown from "../../components/header/LanguageDropdown";
import { ThemeToggleButton } from "../../components/common/ThemeToggleButton";
import { useTranslation } from "../../i18n/useTranslation";
import PlatformEntryLink from "./PlatformEntryLink";

export default function LandingHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { href: "#features", label: t("landing.nav.features") },
    { href: "#modules", label: t("landing.nav.modules") },
    { href: "#benefits", label: t("landing.nav.benefits") },
    { href: "#faq", label: t("landing.nav.faq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 py-2 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 lg:py-4">
      <div className="landing-wrapper">
        <div className="grid grid-cols-2 items-center lg:grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="flex items-center">
            <TipAnimatedLogo size="sm" showWordmark showPlatformName animate />
          </Link>

          <nav className="hidden items-center justify-center gap-8 lg:flex" aria-label={t("landing.nav.aria")}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            <LanguageDropdown />
            <ThemeToggleButton />
            <Link
              to="/signin"
              className="hidden text-sm font-medium text-gray-700 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 lg:block"
            >
              {t("landing.nav.signIn")}
            </Link>
            <PlatformEntryLink
              className="landing-gradient-btn hidden h-11 items-center rounded-full px-5 text-sm font-medium text-white transition hover:opacity-90 lg:inline-flex"
            >
              {t("landing.nav.getStarted")}
            </PlatformEntryLink>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
              aria-label={mobileOpen ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-gray-100 px-5 py-4 dark:border-gray-800 lg:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/signin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {t("landing.nav.signIn")}
            </Link>
            <PlatformEntryLink className="landing-gradient-btn inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-white">
              {t("landing.nav.getStarted")}
            </PlatformEntryLink>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
