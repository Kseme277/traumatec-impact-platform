import { useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../components/common/ComponentCard";
import TableLoader from "../../components/common/TableLoader";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../context/ThemeContext";
import { apexThemeOptions, chartMutedTextColor, chartPrimaryTextColor } from "../../lib/chartTheme";
import { chartEntries } from "./chartLabels";

const TYPE_COLORS = [
  "#465fff",
  "#7592ff",
  "#9cb9ff",
  "#c2d6ff",
  "#7a5af8",
  "#9b8afb",
  "#12b76a",
  "#f59e0b",
  "#f04438",
  "#98a2b3",
];

interface EventsTypeChartProps {
  byType: Record<string, number>;
  isLoading?: boolean;
}

function truncateCenterLabel(label: string, max = 26): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

export default function EventsTypeChart({ byType, isLoading = false }: EventsTypeChartProps) {
  const { t, localeTag } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { categories, values } = chartEntries(byType, t("common.notProvided"));
  const total = values.reduce((sum, value) => sum + value, 0);
  const colors = categories.map((_, index) => TYPE_COLORS[index % TYPE_COLORS.length]);

  const options: ApexOptions = useMemo(
    () => ({
      ...apexThemeOptions(isDark),
      colors,
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "donut",
        height: 300,
        foreColor: chartMutedTextColor(isDark),
      },
      labels: categories,
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: "13px",
                offsetY: -4,
                color: chartMutedTextColor(isDark),
                formatter: (label) => truncateCenterLabel(String(label)),
              },
              value: {
                show: true,
                fontSize: "22px",
                fontWeight: 600,
                color: chartPrimaryTextColor(isDark),
                formatter: (value) => Number(value).toLocaleString(localeTag),
              },
              total: {
                show: true,
                showAlways: true,
                label: t("charts.total"),
                fontSize: "12px",
                color: chartMutedTextColor(isDark),
                formatter: (w) =>
                  w.globals.seriesTotals
                    .reduce((sum: number, value: number) => sum + value, 0)
                    .toLocaleString(localeTag),
              },
            },
          },
        },
      },
      states: {
        hover: { filter: { type: "lighten", value: 0.08 } },
        active: { filter: { type: "none" } },
      },
      tooltip: {
        ...apexThemeOptions(isDark).tooltip,
        y: {
          formatter: (value) => {
            const count = Number(value);
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return `${count.toLocaleString(localeTag)} ${t("charts.eventsCount")} · ${percent}%`;
          },
        },
      },
    }),
    [categories, colors, isDark, localeTag, t, total],
  );

  if (isLoading) {
    return (
      <ComponentCard title={t("charts.eventTypes")} desc={t("charts.eventTypesDesc")}>
        <TableLoader message={t("common.loading")} />
      </ComponentCard>
    );
  }

  if (categories.length === 0) {
    return (
      <ComponentCard title={t("charts.eventTypes")} desc={t("charts.eventTypesDesc")}>
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("charts.noData")}
        </p>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title={t("charts.eventTypes")} desc={t("charts.eventTypesDesc")}>
      <Chart key={theme} options={options} series={values} type="donut" height={300} />
    </ComponentCard>
  );
}
