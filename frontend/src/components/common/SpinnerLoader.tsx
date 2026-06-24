import { Loader2 } from "lucide-react";

interface SpinnerLoaderProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
} as const;

export default function SpinnerLoader({
  message,
  className = "",
  size = "md",
}: SpinnerLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={`${sizeClass[size]} animate-spin text-brand-500`} aria-hidden="true" />
      {message ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      ) : null}
    </div>
  );
}
