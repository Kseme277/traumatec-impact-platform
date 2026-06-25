import Alert from "../ui/alert/Alert";

interface HelpTipAlertProps {
  title: string;
  message: string;
  variant?: "info" | "warning" | "success" | "error";
  linkHref?: string;
  linkText?: string;
}

export default function HelpTipAlert({
  title,
  message,
  variant = "info",
  linkHref,
  linkText,
}: HelpTipAlertProps) {
  return (
    <Alert
      variant={variant}
      title={title}
      message={message}
      showLink={Boolean(linkHref && linkText)}
      linkHref={linkHref ?? "#"}
      linkText={linkText ?? ""}
    />
  );
}
