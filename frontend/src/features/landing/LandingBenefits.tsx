import { useTranslation } from "../../i18n/useTranslation";
import PlatformEntryLink from "./PlatformEntryLink";

const BENEFIT_IMAGES = {
  conformance: "/images/landing/Conformité.png",
  productivity: "/images/landing/Productivité.png",
  cta: "/images/landing/11663450_20944444.png",
} as const;

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
              <div className="landing-benefits-card relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-[20px] p-9 md:p-12">
                <div className="relative z-10 max-w-sm">
                  <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    {t("landing.benefits.card1.title")}
                  </h3>
                  <p className="text-base text-white/80">{t("landing.benefits.card1.description")}</p>
                </div>
                <div className="relative z-10 -mb-4 flex justify-center md:-mb-8">
                  <img
                    src={BENEFIT_IMAGES.conformance}
                    alt=""
                    className="landing-floating-1 max-h-[200px] w-auto object-contain sm:max-h-[240px]"
                    width={320}
                    height={240}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="landing-benefits-card-alt relative flex h-full min-h-[380px] flex-col justify-between overflow-hidden rounded-[20px] p-9 md:p-12">
                <div className="relative z-10 max-w-sm">
                  <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    {t("landing.benefits.card2.title")}
                  </h3>
                  <p className="text-base text-white/80">{t("landing.benefits.card2.description")}</p>
                </div>
                <div className="relative z-10 -mb-4 flex justify-center md:-mb-8">
                  <img
                    src={BENEFIT_IMAGES.productivity}
                    alt=""
                    className="landing-floating-2 max-h-[200px] w-auto object-contain sm:max-h-[240px]"
                    width={320}
                    height={240}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="landing-benefits-cta relative flex flex-col gap-8 overflow-hidden p-8 lg:flex-row lg:items-center lg:justify-between lg:p-12">
                <div className="relative z-10 max-w-lg">
                  <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    {t("landing.benefits.card3.title")}
                  </h3>
                  <p className="mb-8 text-base text-white/70">{t("landing.benefits.card3.description")}</p>
                  <PlatformEntryLink className="inline-flex rounded-full bg-brand-200 px-6 py-3 text-sm font-medium text-brand-950 transition hover:bg-brand-300">
                    {t("landing.benefits.card3.cta")}
                  </PlatformEntryLink>
                </div>
                <div className="relative z-10 flex shrink-0 justify-center lg:justify-end">
                  <img
                    src={BENEFIT_IMAGES.cta}
                    alt=""
                    className="landing-floating-3 max-h-[220px] w-auto object-contain sm:max-h-[280px] lg:max-h-[320px]"
                    width={400}
                    height={320}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
