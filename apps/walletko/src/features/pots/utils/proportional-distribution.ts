// If it's work, it's a good code hahahha. @tsoding
// I tried to implement it manually and here is the result.
// TODO: check Largest remainder method
export function proportionalDistribution(params: {
  index: number;
  newValue: number;
  percentages: number[];
}): number[] {
  const { index, newValue, percentages } = params;

  if (percentages.length === 1) {
    return [100];
  }

  const d = percentages[index] - newValue;
  let delta = Math.abs(d);
  const deltaUnit = d > 0 ? 1 : -1;
  const result = [...percentages];
  result[index] = newValue;
  let cursor = 0;

  while (delta > 0) {
    const tmpPercent = result[cursor] + deltaUnit;
    if (cursor === index || tmpPercent < 0 || tmpPercent > 100) {
      cursor = (cursor + 1) % percentages.length;
      continue;
    }
    result[cursor] = tmpPercent;
    cursor = (cursor + 1) % percentages.length;
    delta--;
  }

  return result;
}
