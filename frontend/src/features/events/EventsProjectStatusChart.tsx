import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../components/common/ComponentCard";
import TableLoader from "../../components/common/TableLoader";
import { useTranslation } from "../../i18n/useTranslation";

const STATUS_COLORS: Record<string, string> = {
  Open: "#f59e0b",
  Closed: "#12b76a",
  Cancelled: "#f04438",
  Unknown: "#98a2b3",
};

interface EventsProjectStatusChartProps {
  byProjectStatus: Record<string, number>;
  isLoading?: boolean;
}

export default function EventsProjectStatusChart({
  byProjectStatus,
  isLoading = false,
}: EventsProjectStatusChartProps) {
  const { t, localeTag } = useTranslation();
  const labels = Object.keys(byProjectStatus);
  const series = Object.values(byProjectStatus);
  const colors = labels.map((label) => STATUS_COLORS[label] ?? STATUS_COLORS.Unknown);

  const options: ApexOptions = {
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 300,
    },
    labels,
    legend: {
      position: "bottom",
      fontSize: "13px",
    },
    dataLabels: { enabled: true, formatter: (val) => `${Math.round(Number(val))}%` },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true,
              label: t("charts.projects"),
              formatter: () =>
                series.reduce((sum, value) => sum + value, 0).toLocaleString(localeTag),
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (value) => `${value} ${t("charts.projectCount")}` } },
  };

  if (isLoading) {
    return (
      <ComponentCard title={t("charts.projectStatus")} desc={t("charts.projectStatusDesc")}>
        <TableLoader message={t("charts.loadingStats")} />
      </ComponentCard>
    );
  }

  if (labels.length === 0) {
    return (
      <ComponentCard title={t("charts.projectStatus")} desc={t("charts.projectStatusDesc")}>
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("charts.noData")}
        </p>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title={t("charts.projectStatus")} desc={t("charts.projectStatusBreakdown")}>
      <Chart options={options} series={series} type="donut" height={300} />
    </ComponentCard>
  );
}
