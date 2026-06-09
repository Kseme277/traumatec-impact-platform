import { useState } from "react";
import Button from "../../../components/ui/button/Button";
import { CopyIcon } from "../../../icons";
import { useTranslation } from "../../../i18n/useTranslation";
import { showError, showSuccess } from "../../../lib/swal";

interface InvitationLinkCopyProps {
  url: string;
  hint?: string | null;
}

export default function InvitationLinkCopy({ url, hint }: InvitationLinkCopyProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      await showSuccess(t("users.linkCopied"), t("users.linkCopiedDesc"));
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      await showError(t("common.error"), t("users.linkCopyFailed"));
    }
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
        {t("users.activationLinkTitle")}
      </p>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        {t("users.inviteLinkFallback")}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          type="text"
          readOnly
          value={url}
          aria-label={t("users.activationLinkTitle")}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-theme-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          onFocus={(e) => e.target.select()}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => void handleCopy()}
        >
          <CopyIcon className="mr-2 size-4" aria-hidden />
          {copied ? t("users.linkCopiedShort") : t("users.copyLink")}
        </Button>
      </div>
      {hint ? (
        <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}
