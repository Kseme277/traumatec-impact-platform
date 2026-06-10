import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";

const FAQ_IDS = ["q1", "q2", "q3", "q4", "q5"] as const;

export default function LandingFaq() {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>("q1");

  return (
    <section id="faq" className="px-5 py-14 dark:bg-gray-dark md:py-28">
      <div className="landing-wrapper">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-800 dark:text-white/90 md:text-4xl">
            {t("landing.faq.title")}
          </h2>
          <p className="mx-auto max-w-md leading-6 text-gray-500 dark:text-gray-400">
            {t("landing.faq.subtitle")}
          </p>
        </div>
        <div className="mx-auto max-w-[600px] space-y-4">
          {FAQ_IDS.map((id) => {
            const isOpen = active === id;
            return (
              <div key={id} className="border-b border-gray-200 pb-5 dark:border-gray-800">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setActive(isOpen ? null : id)}
                  aria-expanded={isOpen}
                >
                  <span className="pr-4 text-lg font-medium text-gray-800 dark:text-white/90">
                    {t(`landing.faq.items.${id}.question`)}
                  </span>
                  <span className="shrink-0 text-brand-500">
                    {isOpen ? <Minus className="size-5" /> : <Plus className="size-5" />}
                  </span>
                </button>
                {isOpen ? (
                  <p className="mt-5 text-base leading-7 text-gray-500 dark:text-gray-400">
                    {t(`landing.faq.items.${id}.answer`)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
