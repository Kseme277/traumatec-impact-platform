import TipSplashLoader from "../brand/TipSplashLoader";

interface TableLoaderProps {
  message?: string;
  className?: string;
}

export default function TableLoader({
  message = "Chargement des données…",
  className = "",
}: TableLoaderProps) {
  return (
    <TipSplashLoader
      message={message}
      variant="inline"
      className={className}
    />
  );
}
