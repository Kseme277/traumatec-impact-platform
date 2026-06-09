export function formatChfCompact(value: number, locale: string): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 10_000) {
    return `${(value / 1_000).toLocaleString(locale, { maximumFractionDigits: 0 })}k`;
  }
  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export function formatChfFull(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}
