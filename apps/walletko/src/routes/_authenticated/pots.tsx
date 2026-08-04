import { createFileRoute } from "@tanstack/react-router";
import { PotsPage } from "src/features/pots/pots-page";
import { potsQuery } from "src/features/pots/queries";
import { totalBalanceQuery } from "src/shared/queries/total-balance";

export const Route = createFileRoute("/_authenticated/pots")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(potsQuery),
      context.queryClient.ensureQueryData(totalBalanceQuery),
    ]);
  },
  component: PotsPage,
});
