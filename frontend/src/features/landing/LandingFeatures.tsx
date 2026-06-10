import { Award, BarChart3, FileText, List, Shield, Sparkles } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";

const FEATURE_KEYS = ["events", "documents", "certificates", "analytics", "audit", "assistant"] as const;
const FEATURE_ICONS = {
  events: List,
  documents: FileText,
  certificates: Award,
  analytics: BarChart3,
  audit: Shield,
  assistant: Sparkles,
} as const;

export default function LandingFeatures() {
  const { t } = useTranslation();

  return (
    <section id="features" className="bg-gray-50 px-5 py-20 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mx-auto mb-3 max-w-xl text-3xl font-bold text-gray-800 dark:text-white/90 md:text-4xl">
            {t("landing.features.title")}
          </h2>
          <p className="mx-auto max-w-xl leading-6 text-gray-500 dark:text-gray-400">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 sm:gap-8">
          {FEATURE_KEYS.map((key) => {
            const Icon = FEATURE_ICONS[key];
            return (
              <div
                key={key}
                className="rounded-[20px] border border-gray-200 bg-white p-9 shadow-theme-sm dark:border-white/5 dark:bg-white/5"
              >
                <div className="mb-9 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <Icon className="size-6" strokeWidth={1.75} />
                </div>
                <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white/90 md:text-2xl">
                  {t(`landing.features.items.${key}.title`)}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t(`landing.features.items.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
