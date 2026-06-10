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

export default function LandingModules() {
  const { t } = useTranslation();
  const [active, setActive] = useState<(typeof MODULE_IDS)[number]>("events");
  const ActiveIcon = MODULE_ICONS[active];

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
            <div className="relative z-20 rounded-2xl border border-white/40 bg-white/80 p-6 shadow-theme-lg backdrop-blur dark:border-white/10 dark:bg-gray-900/80">
              <div className="mb-4 flex items-center gap-2">
                <span className="size-3 rounded-full bg-error-500" />
                <span className="size-3 rounded-full bg-warning-500" />
                <span className="size-3 rounded-full bg-success-500" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5"
                  >
                    <div className="size-10 shrink-0 rounded-lg bg-brand-100 dark:bg-brand-500/20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-3/4 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2 w-1/2 rounded-full bg-gray-100 dark:bg-gray-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
