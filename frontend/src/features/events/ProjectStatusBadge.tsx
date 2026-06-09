import Badge from "../../components/ui/badge/Badge";
import { useTranslation } from "../../i18n/useTranslation";
import { projectStatusColor, projectStatusLabel } from "./projectStatus";

interface ProjectStatusBadgeProps {
  projectStatus: string | null | undefined;
  size?: "sm" | "md";
}

export default function ProjectStatusBadge({ projectStatus, size = "sm" }: ProjectStatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <Badge color={projectStatusColor(projectStatus)} size={size}>
      {projectStatusLabel(projectStatus, t)}
    </Badge>
  );
}
