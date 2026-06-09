interface TableLoaderProps {
  message?: string;
  className?: string;
}

export default function TableLoader({
  message = "Chargement des données…",
  className = "",
}: TableLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="mb-4 size-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
