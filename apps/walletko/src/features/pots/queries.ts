import { queryOptions } from "@tanstack/react-query";
import { listPotsFn } from "src/server/functions/pots.fn";

export const potKeys = {
  all: ["pots"] as const,
  list: () => [...potKeys.all] as const,
};

export const potsQuery = queryOptions({
  queryKey: potKeys.list(),
  queryFn: () => listPotsFn(),
});
