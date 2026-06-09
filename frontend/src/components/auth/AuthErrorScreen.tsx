import { useClerk } from "@clerk/clerk-react";
import GridShape from "../common/GridShape";
import PageMeta from "../common/PageMeta";
import { useTranslation } from "../../i18n/useTranslation";
import { LockIcon } from "../../icons";

interface AuthErrorScreenProps {
  title?: string;
  message: string;
  statusCode?: number | null;
  onRetry?: () => void;
}

type ErrorVariant = "forbidden" | "server" | "unavailable";

interface ErrorPresentation {
  title: string;
  variant: ErrorVariant;
  imageLight?: string;
  imageDark?: string;
}

function resolveErrorPresentation(
  statusCode: number | null | undefined,
  titleOverride: string | undefined,
  t: (key: string) => string,
): ErrorPresentation {
  const isServerError =
    statusCode === 0 ||
    statusCode === 502 ||
    statusCode === 504 ||
    (statusCode !== null && statusCode !== undefined && statusCode >= 500);
  const isUnavailable = statusCode === 503;

  if (titleOverride) {
    return {
      title: titleOverride,
      variant: "forbidden",
    };
  }

  if (isUnavailable) {
    return {
      title: t("auth.serviceUnavailable"),
      variant: "unavailable",
      imageLight: "/images/error/503.svg",
      imageDark: "/images/error/503-dark.svg",
    };
  }

  if (isServerError) {
    return {
      title: t("auth.serverError"),
      variant: "server",
      imageLight: "/images/error/500.svg",
      imageDark: "/images/error/500-dark.svg",
    };
  }

  return {
    title: t("auth.accessDenied"),
    variant: "forbidden",
  };
}

export default function AuthErrorScreen({
  title,
  message,
  statusCode,
  onRetry,
}: AuthErrorScreenProps) {
  const { t } = useTranslation();
  const { signOut } = useClerk();
  const presentation = resolveErrorPresentation(statusCode, title, t);

  return (
    <>
      <PageMeta
        title={`${presentation.title} | ${t("common.appName")}`}
        description={message}
      />
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 z-1">
        <GridShape />
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
            {presentation.title}
          </h1>

          {presentation.variant === "forbidden" ? (
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15"
              aria-hidden
            >
              <LockIcon className="size-12 text-error-500 dark:text-error-400" />
            </div>
          ) : (
            <>
              <img src={presentation.imageLight} alt="" className="mx-auto dark:hidden" />
              <img src={presentation.imageDark} alt="" className="mx-auto hidden dark:block" />
            </>
          )}

          <p className="mt-10 mb-8 text-base text-gray-700 dark:text-gray-400 sm:text-lg">{message}</p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center rounded-lg border border-brand-500 bg-brand-500 px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
              >
                {t("common.retry")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: "/signin" })}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              {t("common.signOut")}
            </button>
          </div>
        </div>
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} — {t("common.appName")}
        </p>
      </div>
    </>
  );
}
