export function formatAmountDraft(value: number): string {
  return value === 0 ? "" : String(value);
}

export function parseAmountDraft(draft: string): number {
  return draft === "" ? 0 : parseFloat(draft);
}

/**
 * Keeps what the user typed ("2.0", "2.00") instead of the value's canonical
 * form ("2"), so digits that do not change the number are not swallowed.
 */
export function syncAmountDraft(draft: string, value: number): string {
  return parseAmountDraft(draft) === value ? draft : formatAmountDraft(value);
}
