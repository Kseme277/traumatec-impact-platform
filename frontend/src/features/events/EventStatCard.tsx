import type { ReactNode } from "react";
import MetricCard from "../../components/common/MetricCard";

interface EventStatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconBgClassName: string;
  to?: string;
  hint?: string;
  onClick?: () => void;
}

export default function EventStatCard(props: EventStatCardProps) {
  return <MetricCard {...props} />;
}
