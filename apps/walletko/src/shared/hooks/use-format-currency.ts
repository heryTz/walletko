const formatter = new Intl.NumberFormat("fr-MG", {
  style: "currency",
  currency: "MGA",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function stripTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, "");
}

export function humanizeFromCent(cents: number): string {
  const mga = cents / 100;
  const magnitude = Math.abs(mga);
  const sign = mga < 0 ? "-" : "";
  if (magnitude >= 1_000_000) {
    return `${sign}${stripTrailingZeros((magnitude / 1_000_000).toFixed(2))}M Ar`;
  }
  if (magnitude >= 1_000) {
    return `${sign}${stripTrailingZeros((magnitude / 1_000).toFixed(2))}K Ar`;
  }
  return `${mga} Ar`;
}

const NARROW_NO_BREAK_SPACE = / /g;
const NO_BREAK_SPACE = " ";

export function useFormatCurrency() {
  return {
    formatFromCent: (cents: number) =>
      formatter
        .format(cents / 100)
        .replace(NARROW_NO_BREAK_SPACE, NO_BREAK_SPACE),
  };
}
