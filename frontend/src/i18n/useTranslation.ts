import { useCallback, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "./translations";

function resolve(obj: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : path;
}

export function useTranslation() {
  const { locale, localeTag, setLocale } = useLanguage();
  const dictionary = translations[locale];

  const t = useCallback((key: string) => resolve(dictionary as unknown as Record<string, unknown>, key), [dictionary]);

  return useMemo(() => ({ t, locale, localeTag, setLocale }), [t, locale, localeTag, setLocale]);
}
