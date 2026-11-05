import { produce } from "immer";
import { assign, setup } from "xstate";

export const POT_COLOR_PALETTE = [
  "#4fb8b2",
  "#e87d4f",
  "#7d4fe8",
  "#4f9ee8",
  "#e84f7d",
  "#8be84f",
  "#e8c84f",
];

export const NEW_POT_ID = "__new__";

type PotField = {
  id: string;
  name: string;
  percentage: number;
  color: string;
  blocked: boolean;
  error: string | null;
};

type PotFormContext = {
  pots: Array<PotField>;
};

type PotFormEvent = { type: "change.name"; value: string };

export const potFormMachine = setup({
  types: {
    context: {} as PotFormContext,
    events: {} as PotFormEvent,
    input: {} as {
      pots: Array<Pick<PotField, "id" | "name" | "percentage" | "color">>;
    },
  },
}).createMachine({
  id: "potForm",
  initial: "editing",
  context: ({ input }) => {
    const old = input.pots.map((el) => ({
      ...el,
      blocked: false,
      error: null,
    }));
    const newPot: PotField = {
      id: NEW_POT_ID,
      name: "New",
      percentage: 0,
      color: POT_COLOR_PALETTE[0],
      blocked: false,
      error: null,
    };
    return {
      pots: [...old, newPot],
    };
  },
  states: {
    editing: {
      on: {
        "change.name": {
          actions: assign(({ context, event }) =>
            produce(context, (draft) => {
              const newPotIndex = draft.pots.findIndex(
                (el) => el.id === NEW_POT_ID,
              );
              draft.pots[newPotIndex].name = event.value;
              if (event.value.length === 0) {
                draft.pots[newPotIndex].error = "Name cannot be empty";
              } else {
                draft.pots[newPotIndex].error = null;
              }
            }),
          ),
        },
      },
    },
  },
});
