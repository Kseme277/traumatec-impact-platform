import type { ReactNode } from "react";
import MetricCard from "../../../components/common/MetricCard";

interface UserStatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconBgClassName: string;
  to?: string;
  hint?: string;
  onClick?: () => void;
}

export default function UserStatCard(props: UserStatCardProps) {
  return <MetricCard {...props} />;
}
