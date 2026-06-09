import { useAuth } from "@clerk/clerk-react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import ComponentCard from "../../components/common/ComponentCard";
import { fetchCorrelationDataset, type CorrelationDataset } from "../../api/analytics";
import { ApiError } from "../../api/client";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../i18n/useTranslation";
import { apexThemeOptions, chartMutedTextColor, chartPrimaryTextColor } from "../../lib/chartTheme";
import { formatChfCompact } from "./chartFormat";
import MlEventsTable from "./MlEventsTable";

const SCATTER_COLORS = ["#465fff", "#7a5af8", "#12b76a", "#f59e0b", "#f04438"];

interface MlCorrelationChartsProps {
  highlightEventId?: string;
  onSelectEvent?: (eventId: string) => void;
}

function formatR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function rTone(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-gray-500";
  const abs = Math.abs(value);
  if (abs >= 0.6) return "text-brand-600 dark:text-brand-400";
  if (abs >= 0.35) return "text-warning-600 dark:text-warning-400";
  return "text-gray-600 dark:text-gray-400";
}

const SCATTER_HEIGHT = 380;

export default function MlCorrelationCharts({ highlightEventId, onSelectEvent }: MlCorrelationChartsProps) {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dataset, setDataset] = useState<CorrelationDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const data = await fetchCorrelationDataset(token);
        if (!cancelled) {
          setDataset(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t("analytics.correlationLoadError"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, t]);

  const baseChart = useMemo(
    () => ({
      ...apexThemeOptions(isDark),
      chart: {
        fontFamily: "Outfit, sans-serif",
        foreColor: chartMutedTextColor(isDark),
        toolbar: { show: true, tools: { download: true, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
      },
      grid: { borderColor: isDark ? "#344054" : "#e4e7ec", strokeDashArray: 4 },
    }),
    [isDark],
  );

  const scatterOptions = (
    xLabel: string,
    yLabel: string,
    opts?: { budgetXAxis?: boolean; percentXAxis?: boolean },
  ): ApexOptions => ({
    ...baseChart,
    chart: {
      ...baseChart.chart,
      type: "scatter",
      zoom: { enabled: true },
      toolbar: { show: true, tools: { download: true, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
    },
    colors: [SCATTER_COLORS[0], SCATTER_COLORS[4]],
    grid: {
      ...baseChart.grid,
      padding: { left: 8, right: 16, top: 8, bottom: opts?.budgetXAxis ? 12 : 4 },
    },
    xaxis: {
      title: { text: xLabel, style: { color: chartMutedTextColor(isDark), fontSize: "12px" } },
      tickAmount: opts?.budgetXAxis ? 5 : 6,
      labels: {
        rotate: opts?.budgetXAxis ? -35 : 0,
        rotateAlways: Boolean(opts?.budgetXAxis),
        hideOverlappingLabels: true,
        trim: true,
        maxHeight: opts?.budgetXAxis ? 72 : 40,
        style: { fontSize: "11px" },
        formatter: (v) => {
          const n = Number(v);
          if (opts?.budgetXAxis) return formatChfCompact(n, localeTag);
          if (opts?.percentXAxis) return `${Math.round(n)}%`;
          return n.toLocaleString(localeTag, { maximumFractionDigits: 0 });
        },
      },
      tooltip: { enabled: false },
    },
    yaxis: {
      title: { text: yLabel, style: { color: chartMutedTextColor(isDark), fontSize: "12px" } },
      labels: {
        formatter: (v) => {
          const n = Number(v);
          if (yLabel.includes("%") || yLabel.toLowerCase().includes("risque")) return `${Math.round(n)}%`;
          return n.toLocaleString(localeTag, { maximumFractionDigits: 0 });
        },
      },
    },
    legend: { show: true, position: "top" },
    markers: { size: 6, strokeWidth: 0, hover: { size: 9 } },
    tooltip: {
      ...baseChart.tooltip,
      x: {
        formatter: (v) => {
          const n = Number(v);
          if (opts?.budgetXAxis) return formatChfCompact(n, localeTag);
          if (opts?.percentXAxis) return `${n.toFixed(1)}%`;
          return String(v);
        },
      },
    },
  });

  const budgetRiskSeries = useMemo(() => {
    if (!dataset) return [];
    const normal = dataset.items.filter((i) => i.event_id !== highlightEventId);
    const highlighted = dataset.items.filter((i) => i.event_id === highlightEventId);
    return [
      {
        name: t("analytics.correlationAllEvents"),
        data: normal.map((i) => [i.amount_chf, i.risk_score] as [number, number]),
      },
      {
        name: t("analytics.correlationSelected"),
        data: highlighted.map((i) => [i.amount_chf, i.risk_score] as [number, number]),
      },
    ];
  }, [dataset, highlightEventId, t]);

  const budgetParticipantsSeries = useMemo(() => {
    if (!dataset) return [];
    return [
      {
        name: t("analytics.predictedParticipants"),
        data: dataset.items.map((i) => [i.amount_chf, i.predicted_participants] as [number, number]),
      },
    ];
  }, [dataset, t]);

  const riskParticipantsSeries = useMemo(() => {
    if (!dataset) return [];
    return [
      {
        name: t("analytics.correlationRiskVsAffluence"),
        data: dataset.items.map((i) => [i.risk_score, i.predicted_participants] as [number, number]),
      },
    ];
  }, [dataset, t]);

  const themeBarOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "bar", stacked: false },
      colors: [SCATTER_COLORS[0], SCATTER_COLORS[2]],
      plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 4 } },
      xaxis: { categories: dataset?.by_theme.map((x) => x.theme) ?? [] },
      legend: { position: "top" },
    }),
    [baseChart, dataset?.by_theme, t],
  );

  const themeBarSeries = useMemo(
    () =>
      dataset
        ? [
            { name: t("analytics.avgRisk"), type: "column", data: dataset.by_theme.map((x) => x.avg_risk) },
            {
              name: t("analytics.avgParticipants"),
              type: "column",
              data: dataset.by_theme.map((x) => x.avg_predicted_participants),
            },
          ]
        : [],
    [dataset, t],
  );

  const cityBarOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "bar" },
      colors: [SCATTER_COLORS[1]],
      plotOptions: { bar: { horizontal: true, barHeight: "65%", borderRadius: 4 } },
      xaxis: {
        labels: {
          formatter: (v) => Number(v).toLocaleString(localeTag, { maximumFractionDigits: 0 }),
        },
      },
      yaxis: {
        labels: {
          maxWidth: 120,
          style: { fontSize: "11px" },
        },
      },
      dataLabels: { enabled: false },
    }),
    [baseChart, localeTag],
  );

  const heatmapOptions: ApexOptions = useMemo(() => {
    const labels = [
      t("analytics.corrBudget"),
      t("analytics.budgetRisk"),
      t("analytics.predictedParticipants"),
      t("analytics.corrRealParticipants"),
    ];
    return {
      ...baseChart,
      chart: { ...baseChart.chart, type: "heatmap" },
      dataLabels: {
        enabled: true,
        style: { colors: [chartPrimaryTextColor(isDark)] },
        formatter: (val) => (val === null || val === undefined ? "—" : Number(val).toFixed(2)),
      },
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.5,
          colorScale: {
            ranges: [
              { from: -1, to: -0.35, color: "#f04438", name: t("analytics.corrNegative") },
              { from: -0.34, to: 0.34, color: "#98a2b3", name: t("analytics.corrWeak") },
              { from: 0.35, to: 1, color: "#465fff", name: t("analytics.corrPositive") },
            ],
          },
        },
      },
      xaxis: { categories: labels },
      yaxis: { categories: labels },
    };
  }, [baseChart, isDark, t]);

  const heatmapSeries = useMemo(() => {
    if (!dataset) return [];
    const c = dataset.coefficients;
    const vals = [
      [1, c.budget_risk, c.budget_predicted_participants, c.budget_real_participants],
      [c.budget_risk, 1, c.risk_predicted_participants, null],
      [c.budget_predicted_participants, c.risk_predicted_participants, 1, null],
      [c.budget_real_participants, null, null, 1],
    ];
    const labels = [
      t("analytics.corrBudget"),
      t("analytics.budgetRisk"),
      t("analytics.predictedParticipants"),
      t("analytics.corrRealParticipants"),
    ];
    return labels.map((name, rowIdx) => ({
      name,
      data: labels.map((_, colIdx) => ({
        x: labels[colIdx],
        y: vals[rowIdx][colIdx] ?? 0,
      })),
    }));
  }, [dataset, t]);

  const emptyMonthSeries = { months: [] as number[], risk: [] as number[], parts: [] as number[] };

  const monthSeries = useMemo(() => {
    if (!dataset) return emptyMonthSeries;
    const byMonth = new Map<number, { risk: number[]; parts: number[] }>();
    for (const item of dataset.items) {
      if (!item.event_month) continue;
      const bucket = byMonth.get(item.event_month) ?? { risk: [], parts: [] };
      bucket.risk.push(item.risk_score);
      bucket.parts.push(item.predicted_participants);
      byMonth.set(item.event_month, bucket);
    }
    const months = [...byMonth.keys()].sort((a, b) => a - b);
    return {
      months,
      risk: months.map((m) => {
        const b = byMonth.get(m)!;
        return Math.round((b.risk.reduce((a, v) => a + v, 0) / b.risk.length) * 10) / 10;
      }),
      parts: months.map((m) => {
        const b = byMonth.get(m)!;
        return Math.round(b.parts.reduce((a, v) => a + v, 0) / b.parts.length);
      }),
    };
  }, [dataset]);

  const monthOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "line" },
      colors: [SCATTER_COLORS[0], SCATTER_COLORS[3]],
      stroke: { width: [3, 3], curve: "smooth" },
      xaxis: {
        categories: (monthSeries.months ?? []).map((m) =>
          new Date(2026, m - 1, 1).toLocaleString(localeTag, { month: "short" }),
        ),
      },
      yaxis: [
        { title: { text: t("analytics.avgRisk") } },
        { opposite: true, title: { text: t("analytics.avgParticipants") } },
      ],
    }),
    [baseChart, localeTag, monthSeries.months, t],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
        <Loader2 className="size-5 animate-spin text-brand-500" />
        {t("analytics.correlationLoading")}
      </div>
    );
  }

  if (error || !dataset || dataset.items.length === 0) {
    return (
      <ComponentCard title={t("analytics.correlationTitle")} desc={t("analytics.correlationDesc")}>
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          {error ?? t("analytics.correlationNoData")}
        </p>
      </ComponentCard>
    );
  }

  const coeffs = [
    { label: t("analytics.corrBudgetRisk"), value: dataset.coefficients.budget_risk },
    { label: t("analytics.corrBudgetPredicted"), value: dataset.coefficients.budget_predicted_participants },
    { label: t("analytics.corrRiskPredicted"), value: dataset.coefficients.risk_predicted_participants },
    { label: t("analytics.corrBudgetReal"), value: dataset.coefficients.budget_real_participants },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("analytics.correlationTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("analytics.correlationDesc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {coeffs.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${rTone(c.value)}`}>{formatR(c.value)}</p>
            <p className="mt-1 text-xs text-gray-400">{t("analytics.pearsonR")}</p>
          </div>
        ))}
      </div>

      {onSelectEvent && (
        <MlEventsTable items={dataset.items} selectedEventId={highlightEventId} onSelectEvent={onSelectEvent} />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t("analytics.scatterBudgetRisk")} desc={t("analytics.scatterBudgetRiskDesc")}>
          <div className="min-w-0 overflow-x-auto">
            <Chart
              options={scatterOptions(t("analytics.corrBudgetChf"), t("analytics.budgetRiskPct"), { budgetXAxis: true })}
              series={budgetRiskSeries}
              type="scatter"
              height={SCATTER_HEIGHT}
              width="100%"
            />
          </div>
        </ComponentCard>
        <ComponentCard title={t("analytics.scatterBudgetParticipants")} desc={t("analytics.scatterBudgetParticipantsDesc")}>
          <div className="min-w-0 overflow-x-auto">
            <Chart
              options={scatterOptions(t("analytics.corrBudgetChf"), t("analytics.participantsCount"), { budgetXAxis: true })}
              series={budgetParticipantsSeries}
              type="scatter"
              height={SCATTER_HEIGHT}
              width="100%"
            />
          </div>
        </ComponentCard>
        <ComponentCard title={t("analytics.scatterRiskParticipants")} desc={t("analytics.scatterRiskParticipantsDesc")}>
          <div className="min-w-0 overflow-x-auto">
            <Chart
              options={scatterOptions(t("analytics.budgetRiskPct"), t("analytics.participantsCount"), { percentXAxis: true })}
              series={riskParticipantsSeries}
              type="scatter"
              height={SCATTER_HEIGHT}
              width="100%"
            />
          </div>
        </ComponentCard>
        <ComponentCard title={t("analytics.heatmapTitle")} desc={t("analytics.heatmapDesc")}>
          <div className="min-w-0 overflow-x-auto">
            <Chart options={heatmapOptions} series={heatmapSeries} type="heatmap" height={SCATTER_HEIGHT} width="100%" />
          </div>
        </ComponentCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t("analytics.byThemeTitle")} desc={t("analytics.byThemeDesc")}>
          <Chart options={themeBarOptions} series={themeBarSeries} type="bar" height={320} />
        </ComponentCard>
        <ComponentCard title={t("analytics.byCityTitle")} desc={t("analytics.byCityDesc")}>
          <Chart
            options={cityBarOptions}
            series={[
              {
                name: t("analytics.avgParticipants"),
                data: dataset.by_city.map((x) => ({ x: x.city, y: x.avg_predicted_participants })),
              },
            ]}
            type="bar"
            height={320}
          />
        </ComponentCard>
      </div>

      {monthSeries.months.length > 1 && (
        <ComponentCard title={t("analytics.byMonthTitle")} desc={t("analytics.byMonthDesc")}>
          <Chart
            options={monthOptions}
            series={[
              { name: t("analytics.avgRisk"), type: "line", data: monthSeries.risk },
              { name: t("analytics.avgParticipants"), type: "line", data: monthSeries.parts },
            ]}
            type="line"
            height={300}
          />
        </ComponentCard>
      )}
    </div>
  );
}
