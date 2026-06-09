import { ChevronDownIcon } from "../../icons";

type SelectChevronProps = {
  className?: string;
};

/** Indicateur visuel pour les champs select (flèche vers le bas). */
export default function SelectChevron({ className = "size-5" }: SelectChevronProps) {
  return (
    <ChevronDownIcon
      className={`stroke-current ${className}`}
      aria-hidden="true"
    />
  );
}
