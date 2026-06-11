import { useState } from "react";
import { Award, BarChart3, FileText, List } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";

const MODULE_IDS = ["events", "documents", "certificates", "analytics"] as const;
const MODULE_ICONS = {
  events: List,
  documents: FileText,
  certificates: Award,
  analytics: BarChart3,
} as const;
const MODULE_IMAGES = {
  events: {
    light: "/images/landing/event-img.png",
    dark: "/images/landing/event-img-dark.png",
  },
  documents: {
    light: "/images/landing/document-img.png",
    dark: "/images/landing/document-img-dark.png",
  },
  certificates: {
    light: "/images/landing/certificat-img.png",
    dark: "/images/landing/certificat-img-dark.png",
  },
  analytics: {
    light: "/images/landing/predict-img.png",
    dark: "/images/landing/predict-img-dark.png",
  },
} as const;

export default function LandingModules() {
  const { t } = useTranslation();
  const [active, setActive] = useState<(typeof MODULE_IDS)[number]>("events");
  const ActiveIcon = MODULE_ICONS[active];
  const images = MODULE_IMAGES[active];
  const imageAlt = t(`landing.modules.content.${active}.title`);

  return (
    <section id="modules" className="px-5 py-20 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mx-auto mb-3 max-w-xl text-3xl font-bold text-gray-800 dark:text-white/90 md:text-4xl">
            {t("landing.modules.title")}
          </h2>
          <p className="mx-auto max-w-xl text-gray-500 dark:text-gray-400">
            {t("landing.modules.subtitle")}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2 sm:gap-3">
          {MODULE_IDS.map((id) => {
            const Icon = MODULE_ICONS[id];
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "border-brand-500 bg-brand-500 text-white shadow-theme-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/40"
                }`}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {t(`landing.modules.tabs.${id}`)}
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/60 p-6 shadow-theme-sm sm:p-10 dark:border-gray-800 dark:from-gray-800 dark:via-gray-900 dark:to-brand-950/50">
          <div className="relative z-20 grid items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-white">
                <ActiveIcon className="size-7" strokeWidth={1.75} />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white/90 md:text-3xl">
                {t(`landing.modules.content.${active}.title`)}
              </h3>
              <p className="text-base leading-7 text-gray-500 dark:text-gray-400">
                {t(`landing.modules.content.${active}.description`)}
              </p>
            </div>
            <div className="relative z-20 overflow-hidden rounded-2xl border border-white/40 bg-white/80 shadow-theme-lg backdrop-blur dark:border-white/10 dark:bg-gray-900/80">
              <img
                key={`${active}-light`}
                src={images.light}
                alt={imageAlt}
                className="block w-full rounded-2xl dark:hidden"
                width={560}
                height={400}
              />
              <img
                key={`${active}-dark`}
                src={images.dark}
                alt={imageAlt}
                className="hidden w-full rounded-2xl dark:block"
                width={560}
                height={400}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
