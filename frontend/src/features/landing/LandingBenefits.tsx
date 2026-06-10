import { useTranslation } from "../../i18n/useTranslation";
import PlatformEntryLink from "./PlatformEntryLink";

export default function LandingBenefits() {
  const { t } = useTranslation();

  return (
    <section id="benefits" className="bg-gray-900 py-14 md:py-28">
      <div className="landing-wrapper">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mx-auto mb-3 max-w-lg text-3xl font-bold text-white md:text-4xl">
            {t("landing.benefits.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-6 text-white/50">
            {t("landing.benefits.subtitle")}
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="landing-benefits-card relative flex min-h-[320px] flex-col justify-between rounded-[20px] p-9 md:p-12">
                <div className="max-w-sm">
                  <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    {t("landing.benefits.card1.title")}
                  </h3>
                  <p className="text-base text-white/80">{t("landing.benefits.card1.description")}</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6">
              <div className="flex h-full flex-col justify-between rounded-[20px] bg-brand-600 p-9 md:p-12">
                <div>
                  <h3 className="mb-4 max-w-xs text-2xl font-bold text-white md:text-3xl">
                    {t("landing.benefits.card2.title")}
                  </h3>
                  <p className="max-w-sm text-base text-white/70">
                    {t("landing.benefits.card2.description")}
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-12">
              <div className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-[20px] bg-brand-950 p-8 lg:flex-row lg:items-center lg:p-12">
                <div className="relative z-10 max-w-lg">
                  <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    {t("landing.benefits.card3.title")}
                  </h3>
                  <p className="mb-8 text-base text-white/70">{t("landing.benefits.card3.description")}</p>
                  <PlatformEntryLink className="inline-flex rounded-full bg-brand-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-600">
                    {t("landing.benefits.card3.cta")}
                  </PlatformEntryLink>
                </div>
                <div className="relative z-10 hidden size-48 rounded-full bg-brand-500/20 lg:block" aria-hidden="true" />
                <div
                  className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-500/30 blur-3xl"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
