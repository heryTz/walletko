import { useFormatCurrency } from "src/shared/hooks/use-format-currency";

const GROUP = " ";
const BEFORE_SYMBOL = " ";

describe("formatFromCent", () => {
  const { formatFromCent } = useFormatCurrency();

  it("keeps the cent decimals", () => {
    expect(formatFromCent(465_812)).toBe(`4${GROUP}658,12${BEFORE_SYMBOL}Ar`);
  });

  it("pads whole amounts to two decimals", () => {
    expect(formatFromCent(50_000)).toBe(`500,00${BEFORE_SYMBOL}Ar`);
  });

  it("handles zero", () => {
    expect(formatFromCent(0)).toBe(`0,00${BEFORE_SYMBOL}Ar`);
  });

  it("handles negative amounts", () => {
    expect(formatFromCent(-465_812)).toBe(`-4${GROUP}658,12${BEFORE_SYMBOL}Ar`);
  });
});
