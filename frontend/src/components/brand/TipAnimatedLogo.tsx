import { useTranslation } from "../../i18n/useTranslation";

export type TipLogoSize = "xs" | "sm" | "md" | "lg";
export type TipLogoVariant = "default" | "onDark";
export type TipLogoLayout = "row" | "stack";

export interface TipAnimatedLogoProps {
  className?: string;
  size?: TipLogoSize;
  variant?: TipLogoVariant;
  layout?: TipLogoLayout;
  iconOnly?: boolean;
  showWordmark?: boolean;
  showPlatformName?: boolean;
  showSlogan?: boolean;
  animate?: boolean;
  title?: string;
}

const SIZE_CONFIG: Record<
  TipLogoSize,
  { icon: number; brand: string; slogan: string; gap: string }
> = {
  xs: { icon: 28, brand: "text-sm font-semibold", slogan: "text-[11px]", gap: "gap-2" },
  sm: { icon: 36, brand: "text-base font-semibold", slogan: "text-xs", gap: "gap-2.5" },
  md: { icon: 48, brand: "text-lg font-semibold", slogan: "text-sm", gap: "gap-3" },
  lg: { icon: 72, brand: "text-2xl font-bold tracking-tight", slogan: "text-sm", gap: "gap-4" },
};

const LOGO_BARS = [
  { points: "20.39 18.24 20.39 8 11.52 2.89 11.52 7.55 16.37 10.32 16.35 15.91 20.39 18.24", tone: "tip-logo-bar--1" },
  { points: "14.79 19.86 14.79 11.23 7.33 6.92 7.33 10.94 11.34 13.23 11.32 17.85 14.79 19.86", tone: "tip-logo-bar--2" },
  { points: "9.76 21.15 9.76 14.14 3.69 10.64 3.69 14 6.86 15.81 6.84 19.47 9.76 21.15", tone: "tip-logo-bar--3" },
] as const;

function LogoIcon({
  size,
  animate,
  title,
}: {
  size: number;
  animate: boolean;
  title: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      className="tip-logo__svg shrink-0"
    >
      <title>{title}</title>
      {LOGO_BARS.map((bar, index) => (
        <polygon
          key={index}
          points={bar.points}
          className={[bar.tone, animate ? "tip-logo-bar" : undefined].filter(Boolean).join(" ")}
        />
      ))}
    </svg>
  );
}

export default function TipAnimatedLogo({
  className = "",
  size = "md",
  variant = "default",
  layout,
  iconOnly = false,
  showWordmark = true,
  showPlatformName = false,
  showSlogan = false,
  animate = true,
  title,
}: TipAnimatedLogoProps) {
  const { t } = useTranslation();
  const config = SIZE_CONFIG[size];
  const label = title ?? t("common.appName");
  const brandName = showPlatformName ? "Traumatec" : label;
  const resolvedLayout = layout ?? (showSlogan ? "stack" : "row");
  const variantClass = variant === "onDark" ? "tip-logo--on-dark" : "tip-logo--default";
  const showBrand = !iconOnly && showWordmark;
  const showTagline = showBrand && showSlogan;

  return (
    <span
      className={[
        "tip-logo",
        variantClass,
        resolvedLayout === "stack" ? "flex flex-col items-center text-center" : `inline-flex items-center ${config.gap}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LogoIcon size={config.icon} animate={animate} title={label} />
      {showBrand ? (
        <span className={resolvedLayout === "stack" ? "flex flex-col items-center gap-1" : "min-w-0"}>
          <span className={`tip-logo__brand leading-tight ${config.brand}`}>{brandName}</span>
          {showTagline ? (
            <span className={`tip-logo__slogan max-w-xs font-normal leading-snug ${config.slogan}`}>
              {t("common.appSlogan")}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
