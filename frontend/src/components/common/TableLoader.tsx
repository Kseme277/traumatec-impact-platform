import SpinnerLoader from "./SpinnerLoader";

interface TableLoaderProps {
  message?: string;
  className?: string;
}

export default function TableLoader({
  message = "Chargement des données…",
  className = "",
}: TableLoaderProps) {
  return <SpinnerLoader message={message} className={className} />;
}
