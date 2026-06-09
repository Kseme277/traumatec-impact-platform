import type { ApexOptions } from "apexcharts";

export function apexThemeOptions(isDark: boolean): Pick<ApexOptions, "theme" | "tooltip"> {
  return {
    theme: { mode: isDark ? "dark" : "light" },
    tooltip: { theme: isDark ? "dark" : "light" },
  };
}

export function chartMutedTextColor(isDark: boolean): string {
  return isDark ? "#98a2b3" : "#667085";
}

export function chartPrimaryTextColor(isDark: boolean): string {
  return isDark ? "#f2f4f7" : "#1d2939";
}
