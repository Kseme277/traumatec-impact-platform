import TipAnimatedLogo from "../brand/TipAnimatedLogo";

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
      <div className="mb-5">
        <TipAnimatedLogo size="lg" showWordmark showPlatformName showSlogan animate />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
