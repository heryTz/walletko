import { queryOptions } from "@tanstack/react-query";
import { getTotalBalanceFn } from "src/server/functions/pots.fn";

export const totalBalanceKeys = {
  all: ["pots", "total-balance"] as const,
};

export const totalBalanceQuery = queryOptions({
  queryKey: totalBalanceKeys.all,
  queryFn: () => getTotalBalanceFn(),
});
