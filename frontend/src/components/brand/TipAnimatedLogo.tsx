import { useTranslation } from "../../i18n/useTranslation";

export type TipLogoSize = "xs" | "sm" | "md" | "lg";
export type TipLogoVariant = "default" | "onDark";

export interface TipAnimatedLogoProps {
  className?: string;
  size?: TipLogoSize;
  variant?: TipLogoVariant;
  iconOnly?: boolean;
  showWordmark?: boolean;
  showPlatformName?: boolean;
  showSlogan?: boolean;
  animate?: boolean;
  title?: string;
}

const PATH_CHEVRON =
  "M343.6 75.9v20.3l23.1 21.8-23.1 21.8v20.3l44.6-42.1zM326.4 139.8l-23.1-21.8 23.1-21.8v-20.3l-44.6 42.1 44.6 42.1z";

const PATH_CIRCLES =
  "M335 38.9c-43.7 0-79.1 35.4-79.1 79.1s35.4 79.1 79.1 79.1 79.1-35.4 79.1-79.1-35.4-79.1-79.1-79.1zM335 182.9c-35.8 0-64.9-29.1-64.9-64.9s29.1-64.9 64.9-64.9 64.9 29.1 64.9 64.9-29.1 64.9-64.9 64.9z";

/** Lettres TIP — espacement uniforme (5 u) entre T, I et P. */
const LETTER_GAP = 5;
/** Tige et barre du T à 10 u d'épaisseur (aligné sur I / P). */
const LETTER_T = "M2 2H40V12H26V44H16V12H2V2Z";
const LETTER_T_RIGHT = 40;
const LETTER_I_WIDTH = 10;
const LETTER_I_LEFT = LETTER_T_RIGHT + LETTER_GAP;
const LETTER_I = `M${LETTER_I_LEFT} 2H${LETTER_I_LEFT + LETTER_I_WIDTH}V44H${LETTER_I_LEFT}V2Z`;
const LETTER_P =
  "M60 2H82C92.5 2 99 8.5 99 20.5C99 32.5 92.5 39 82 39H70V44H60V2ZM70 11H81C86 11 90 14 90 20.5C90 27 86 30 81 30H70V11Z";

const ICON_VIEWBOX = "256 36 158 148";

/** Centre vertical du pictogramme (cercles). */
const ICON_CENTER_Y = 110;
/** Lettres : hauteur locale 44, centrées sur le pictogramme. */
const LETTER_LOCAL_HEIGHT = 44;
const LETTER_SCALE = 2.05;
const LETTERS_X = 424;
const LETTERS_Y = ICON_CENTER_Y - (LETTER_LOCAL_HEIGHT * LETTER_SCALE) / 2;
const LETTERS_TRANSFORM = `translate(${LETTERS_X} ${LETTERS_Y}) scale(${LETTER_SCALE})`;

const COMBINED_VIEWBOX = "248 32 378 152";

const SIZE_CONFIG: Record<
  TipLogoSize,
  {
    height: number;
    iconOnlyWidth: number;
    fullWidth: number;
    stroke: number;
    platform: string;
    slogan: string;
  }
> = {
  xs: { height: 32, iconOnlyWidth: 32, fullWidth: 92, stroke: 3.5, platform: "text-[6px]", slogan: "text-[5px]" },
  sm: { height: 40, iconOnlyWidth: 40, fullWidth: 114, stroke: 4, platform: "text-[7px]", slogan: "text-[6px]" },
  md: { height: 48, iconOnlyWidth: 48, fullWidth: 136, stroke: 4, platform: "text-[7px]", slogan: "text-[7px]" },
  lg: { height: 64, iconOnlyWidth: 64, fullWidth: 180, stroke: 4.5, platform: "text-[8px]", slogan: "text-[8px]" },
};

function pathClass(
  animate: boolean,
  kind: "short" | "long" | "letter-t" | "letter-i" | "letter-p",
) {
  if (!animate) return "tip-logo-path tip-logo-path--static";
  return `tip-logo-path tip-logo-path--${kind}`;
}

function TipLogoSvg({
  height,
  width,
  viewBox,
  strokeWidth,
  animate,
  title,
  showWordmark,
}: {
  height: number;
  width: number;
  viewBox: string;
  strokeWidth: number;
  animate: boolean;
  title: string;
  showWordmark: boolean;
}) {
  /** Compense le scale du groupe lettres pour garder le même trait que l'icône. */
  const letterStroke = strokeWidth / LETTER_SCALE;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      role="img"
      aria-label={title}
      className="tip-logo__svg shrink-0 overflow-visible"
    >
      <title>{title}</title>
      <path
        className={pathClass(animate, "short")}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeMiterlimit={10}
        strokeDasharray="300"
        strokeDashoffset="300"
        pathLength={300}
        d={PATH_CHEVRON}
      />
      <path
        className={pathClass(animate, "long")}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeMiterlimit={10}
        strokeDasharray="500"
        strokeDashoffset="500"
        pathLength={500}
        d={PATH_CIRCLES}
      />
      {showWordmark && (
        <g transform={LETTERS_TRANSFORM}>
          <path
            className={pathClass(animate, "letter-t")}
            fillRule="evenodd"
            strokeWidth={letterStroke}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="150"
            strokeDashoffset="150"
            pathLength={150}
            d={LETTER_T}
          />
          <path
            className={pathClass(animate, "letter-i")}
            fillRule="evenodd"
            strokeWidth={letterStroke}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="110"
            strokeDashoffset="110"
            pathLength={110}
            d={LETTER_I}
          />
          <path
            className={pathClass(animate, "letter-p")}
            fillRule="evenodd"
            strokeWidth={letterStroke}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="190"
            strokeDashoffset="190"
            pathLength={190}
            d={LETTER_P}
          />
        </g>
      )}
    </svg>
  );
}

export default function TipAnimatedLogo({
  className = "",
  size = "md",
  variant = "default",
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
  const displayWordmark = !iconOnly && showWordmark;
  const displayPlatform = !iconOnly && showPlatformName;
  const displaySlogan = displayWordmark && showSlogan;
  const variantClass = variant === "onDark" ? "tip-logo--on-dark" : "tip-logo--default";

  return (
    <span
      className={`tip-logo ${variantClass} relative inline-flex overflow-visible ${displaySlogan ? "flex-col gap-1" : "items-center"} ${className}`.trim()}
    >
      {displayPlatform && (
        <span
          className={`tip-logo__platform pointer-events-none absolute left-0 top-1/2 z-0 w-[42%] -translate-y-1/2 text-center font-outfit font-semibold uppercase leading-tight tracking-widest select-none ${config.platform}`}
          aria-hidden
        >
          Traumatec
        </span>
      )}
      <span className="relative z-10">
        <TipLogoSvg
          height={config.height}
          width={displayWordmark ? config.fullWidth : config.iconOnlyWidth}
          viewBox={displayWordmark ? COMBINED_VIEWBOX : ICON_VIEWBOX}
          strokeWidth={config.stroke}
          animate={animate}
          title={label}
          showWordmark={displayWordmark}
        />
      </span>
      {displaySlogan && (
        <span
          className={`tip-logo__slogan relative z-10 ml-[44%] block w-[56%] text-center font-outfit font-medium leading-tight tracking-wide ${config.slogan}`}
        >
          {t("common.appSlogan")}
        </span>
      )}
    </span>
  );
}
