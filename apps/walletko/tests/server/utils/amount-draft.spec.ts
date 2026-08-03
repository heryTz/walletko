import {
  formatAmountDraft,
  parseAmountDraft,
  syncAmountDraft,
} from "src/shared/lib/amount-draft";

describe("formatAmountDraft", () => {
  it("renders an empty draft for the zero placeholder", () => {
    expect(formatAmountDraft(0)).toBe("");
  });

  it("renders the number as typed", () => {
    expect(formatAmountDraft(2)).toBe("2");
    expect(formatAmountDraft(2.5)).toBe("2.5");
  });
});

describe("parseAmountDraft", () => {
  it("treats an empty draft as zero", () => {
    expect(parseAmountDraft("")).toBe(0);
  });

  it("parses decimal drafts", () => {
    expect(parseAmountDraft("2.0")).toBe(2);
    expect(parseAmountDraft("2.5")).toBe(2.5);
  });
});

describe("syncAmountDraft", () => {
  it("keeps a trailing zero the draft already spells out", () => {
    expect(syncAmountDraft("2.0", 2)).toBe("2.0");
    expect(syncAmountDraft("2.00", 2)).toBe("2.00");
  });

  it("keeps a leading zero the draft already spells out", () => {
    expect(syncAmountDraft("0", 0)).toBe("0");
  });

  it("keeps drafts whose value already matches", () => {
    expect(syncAmountDraft("2.5", 2.5)).toBe("2.5");
    expect(syncAmountDraft("", 0)).toBe("");
  });

  it("adopts the value when the draft spells out a different number", () => {
    expect(syncAmountDraft("2.00", 5)).toBe("5");
    expect(syncAmountDraft("2.5", 0)).toBe("");
  });
});
