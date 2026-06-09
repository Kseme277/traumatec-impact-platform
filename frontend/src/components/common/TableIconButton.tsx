import type { ReactNode } from "react";
import { Link } from "react-router";

interface TableIconButtonProps {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "default" | "danger" | "success";
}

const variantClasses: Record<NonNullable<TableIconButtonProps["variant"]>, string> = {
  default:
    "text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-brand-400",
  danger:
    "text-gray-500 hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400",
  success:
    "text-gray-500 hover:bg-success-50 hover:text-success-600 dark:text-gray-400 dark:hover:bg-success-500/10 dark:hover:text-success-400",
};

export default function TableIconButton({
  label,
  children,
  onClick,
  href,
  disabled = false,
  variant = "default",
}: TableIconButtonProps) {
  const className = `inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 ${variantClasses[variant]}`;

  if (href && !disabled) {
    return (
      <Link to={href} className={className} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
