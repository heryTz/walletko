import { proportionalDistribution } from "./proportional-distribution";

describe("proportionalDistribution", () => {
  it("takes the increase evenly from the other pots", () => {
    expect(
      proportionalDistribution({
        index: 2,
        newValue: 10,
        percentages: [60, 40, 0],
      }),
    ).toEqual([55, 35, 10]);
  });

  it("drains every other pot to 0 when a pot is set to 100", () => {
    expect(
      proportionalDistribution({
        index: 2,
        newValue: 100,
        percentages: [60, 40, 0],
      }),
    ).toEqual([0, 0, 100]);
  });

  it("gives the decrease back evenly to the other pots", () => {
    expect(
      proportionalDistribution({
        index: 2,
        newValue: 10,
        percentages: [60, 20, 20],
      }),
    ).toEqual([65, 25, 10]);
  });

  it("skips pots already at 0 when taking the increase", () => {
    expect(
      proportionalDistribution({
        index: 2,
        newValue: 10,
        percentages: [100, 0, 0],
      }),
    ).toEqual([90, 0, 10]);
  });

  it("spreads a full 100 evenly when a pot is set to 0", () => {
    expect(
      proportionalDistribution({
        index: 2,
        newValue: 0,
        percentages: [0, 0, 100],
      }),
    ).toEqual([50, 50, 0]);
  });

  it("gives the freed share to the only other pot", () => {
    expect(
      proportionalDistribution({
        index: 0,
        newValue: 0,
        percentages: [90, 10],
      }),
    ).toEqual([0, 100]);
  });

  it("leaves a single pot at 100", () => {
    expect(
      proportionalDistribution({ index: 0, newValue: 100, percentages: [100] }),
    ).toEqual([100]);
  });

  it("1", () => {
    expect(
      proportionalDistribution({
        index: 0,
        newValue: 60,
        percentages: [50, 5, 45],
      }),
    ).toEqual([60, 0, 40]);
  });
});
