import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { fetchTemplateVariablesGuide } from "../../api/catalog";
import { getApiToken } from "../../lib/clerkToken";
import { useTranslation } from "../../i18n/useTranslation";

export interface TemplateVariableGuideRow {
  key: string;
  placeholders: string[];
  event_field: string;
  example: string;
  label: string;
  description: string;
  primary_placeholder: string;
  category: string;
}

export interface TemplateVariablesGuide {
  locale: string;
  variables: TemplateVariableGuideRow[];
  keep_samples: { sample: string; label: string; description: string }[];
  categories: { id: string; label: string }[];
  mechanisms: { id: string; title: string; description: string }[];
}

export default function TemplateVariablesGuide() {
  const { t, locale } = useTranslation();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [guide, setGuide] = useState<TemplateVariablesGuide | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getApiToken(getToken);
        const data = await fetchTemplateVariablesGuide(token, locale.startsWith("en") ? "en" : "fr");
        if (!cancelled) setGuide(data);
      } catch {
        if (!cancelled) setError(t("documents.variablesGuideLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, locale, t]);

  const categoryOrder = useMemo(
    () => guide?.categories.map((c) => c.id) ?? [],
    [guide],
  );

  const categoryLabel = (id: string) =>
    guide?.categories.find((c) => c.id === id)?.label ?? id;

  const grouped = useMemo(() => {
    if (!guide) return [];
    const byCat = new Map<string, TemplateVariableGuideRow[]>();
    for (const row of guide.variables) {
      const list = byCat.get(row.category) ?? [];
      list.push(row);
      byCat.set(row.category, list);
    }
    return categoryOrder
      .filter((id) => (byCat.get(id)?.length ?? 0) > 0)
      .map((id) => ({ id, rows: byCat.get(id) ?? [] }));
  }, [guide, categoryOrder]);

  if (error) {
    return <p className="text-sm text-error-600 dark:text-error-400">{error}</p>;
  }

  if (!guide) {
    return <p className="text-sm text-gray-500">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {guide.mechanisms.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/40"
          >
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.title}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">{t("documents.variablesGuideIntro")}</p>

      {grouped.map(({ id, rows }) => (
        <div key={id}>
          <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            {categoryLabel(id)}
          </h4>
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="px-3 py-2 text-xs">{t("documents.varColPlaceholder")}</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-xs">{t("documents.varColMeaning")}</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-xs">{t("documents.varColEventField")}</TableCell>
                  <TableCell isHeader className="px-3 py-2 text-xs">{t("documents.varColExample")}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="px-3 py-2 align-top">
                      <code className="text-xs text-brand-700 dark:text-brand-300">{row.primary_placeholder}</code>
                      {row.placeholders.length > 1 && (
                        <p className="mt-1 text-[11px] text-gray-400">
                          {row.placeholders.slice(1, 3).join(" · ")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 align-top text-sm text-gray-700 dark:text-gray-200">
                      <span className="font-medium">{row.label}</span>
                      <p className="mt-0.5 text-xs text-gray-500">{row.description}</p>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-top text-xs text-gray-500">{row.event_field}</TableCell>
                    <TableCell className="px-3 py-2 align-top text-xs text-gray-600 dark:text-gray-300">{row.example}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          {t("documents.varKeepTitle")}
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
          {guide.keep_samples.map((item) => (
            <li key={item.sample}>
              <code className="text-xs">{item.sample}</code> — {item.description}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">{t("documents.variablesScriptHint")}</p>
    </div>
  );
}
