import { Sparkles } from "lucide-react";
import { useCommandAssistant } from "../../context/CommandAssistantContext";
import { useTranslation } from "../../i18n/useTranslation";

export default function CommandAssistantFab() {
  const { open, isOpen } = useCommandAssistant();
  const { t } = useTranslation();

  if (isOpen) return null;

  return (
    <button
      type="button"
      data-tour="assistant-fab"
      onClick={open}
      aria-label={t("assistant.open")}
      title={t("assistant.open")}
      className="fixed bottom-6 right-6 z-99990 inline-flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-lg transition hover:bg-brand-600 hover:shadow-theme-xl"
    >
      <Sparkles className="size-6" />
    </button>
  );
}
