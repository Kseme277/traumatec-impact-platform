import PageMeta from "../components/common/PageMeta";
import LandingBenefits from "../features/landing/LandingBenefits";
import LandingFaq from "../features/landing/LandingFaq";
import LandingFeatures from "../features/landing/LandingFeatures";
import LandingFooter from "../features/landing/LandingFooter";
import LandingHeader from "../features/landing/LandingHeader";
import LandingHero from "../features/landing/LandingHero";
import LandingModules from "../features/landing/LandingModules";
import { useTranslation } from "../i18n/useTranslation";

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta title={t("landing.meta.title")} description={t("landing.meta.description")} />
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
        <LandingHeader />
        <main className="flex-1">
          <LandingHero />
          <LandingFeatures />
          <LandingModules />
          <LandingBenefits />
          <LandingFaq />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
