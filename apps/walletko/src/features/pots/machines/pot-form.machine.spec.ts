import { createActor } from "xstate";
import {
  NEW_POT_ID,
  POT_COLOR_PALETTE,
  potFormMachine,
} from "./pot-form.machine";

const GENERAL = {
  id: "1",
  name: "Pot 1",
  percentage: 40,
  color: POT_COLOR_PALETTE[0],
  error: null,
};
const SAVINGS = {
  id: "2",
  name: "Pot 2",
  percentage: 60,
  color: POT_COLOR_PALETTE[1],
  error: null,
};

const DEFAULT_POTS = [GENERAL, SAVINGS];

describe("pot-form.machine", () => {
  it("start in editing", () => {
    const actor = createActor(potFormMachine, {
      input: { pots: DEFAULT_POTS },
    }).start();
    expect(actor.getSnapshot().matches("editing")).toBe(true);
  });

  it(`when add new pot, appends it with existing pots`, () => {
    const actor = createActor(potFormMachine, {
      input: { pots: DEFAULT_POTS },
    }).start();
    expect(actor.getSnapshot().context.pots).toEqual([
      { ...GENERAL, blocked: false },
      { ...SAVINGS, blocked: false },
      {
        id: NEW_POT_ID,
        name: "New",
        percentage: 0,
        color: POT_COLOR_PALETTE[0],
        blocked: false,
        error: null,
      },
    ]);
  });

  describe(`when the new pot name changes`, () => {
    it(`update the name of that pot`, () => {
      const actor = createActor(potFormMachine, {
        input: { pots: DEFAULT_POTS },
      }).start();
      actor.send({ type: "change.name", value: "Car" });
      const newPot = actor
        .getSnapshot()
        .context.pots.find((el) => el.id === NEW_POT_ID);
      expect(newPot?.name).toBe("Car");
    });

    it(`show error when the new one is empty`, () => {
      const actor = createActor(potFormMachine, {
        input: { pots: DEFAULT_POTS },
      }).start();
      actor.send({ type: "change.name", value: "" });
      const newPot = actor
        .getSnapshot()
        .context.pots.find((el) => el.id === NEW_POT_ID);
      expect(newPot?.error).toBe("Name cannot be empty");
    });

    it(`remove error when a previous empty name is followed by a new one that's not empty`, () => {
      const actor = createActor(potFormMachine, {
        input: { pots: DEFAULT_POTS },
      }).start();
      actor.send({ type: "change.name", value: "" });
      actor.send({ type: "change.name", value: "Car" });
      const newPot = actor
        .getSnapshot()
        .context.pots.find((el) => el.id === NEW_POT_ID);
      expect(newPot?.error).toBeNull();
    });
  });
});
