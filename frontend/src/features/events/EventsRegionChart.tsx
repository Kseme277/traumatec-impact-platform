import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../components/common/ComponentCard";
import TableLoader from "../../components/common/TableLoader";
import { useTranslation } from "../../i18n/useTranslation";
import { chartEntries, truncateLabel } from "./chartLabels";

interface EventsRegionChartProps {
  byRegion: Record<string, number>;
  isLoading?: boolean;
}

export default function EventsRegionChart({ byRegion, isLoading = false }: EventsRegionChartProps) {
  const { t, localeTag } = useTranslation();
  const { categories, values } = chartEntries(byRegion, t("common.notProvided"));
  const chartHeight = Math.max(280, categories.length * 32);

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: chartHeight,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "70%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        formatter: (val) => {
          const n = Number(val);
          return Number.isFinite(n) ? Math.round(n).toLocaleString(localeTag) : "";
        },
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px" },
        maxWidth: 160,
        formatter: (val) => truncateLabel(String(val), 28),
      },
    },
    grid: { strokeDashArray: 4, padding: { left: 8 } },
    tooltip: {
      y: {
        formatter: (_value, opts) => {
          const label = categories[opts.dataPointIndex] ?? "";
          const count = values[opts.dataPointIndex] ?? 0;
          return `${label} : ${count.toLocaleString(localeTag)} ${t("charts.eventsCount")}`;
        },
      },
    },
  };

  if (isLoading) {
    return (
      <ComponentCard title={t("charts.regions")} desc={t("charts.regionsDesc")}>
        <TableLoader message={t("charts.loadingStats")} />
      </ComponentCard>
    );
  }

  if (categories.length === 0) {
    return (
      <ComponentCard title={t("charts.regions")} desc={t("charts.regionsDesc")}>
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("charts.noRegion")}
        </p>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title={t("charts.regions")} desc={t("charts.regionsTop")}>
      <Chart
        options={options}
        series={[{ name: t("charts.events"), data: values }]}
        type="bar"
        height={chartHeight}
      />
    </ComponentCard>
  );
}
