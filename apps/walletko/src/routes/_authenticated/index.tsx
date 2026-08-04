import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "src/features/dashboard/dashboard-page";
import {
  overviewStatsQuery,
  topPotsQuery,
  yearStatsQuery,
} from "src/features/dashboard/queries";

export const Route = createFileRoute("/_authenticated/")({
  loader: async ({ context }) => {
    const year = new Date().getFullYear();
    await Promise.all([
      context.queryClient.ensureQueryData(overviewStatsQuery),
      context.queryClient.ensureQueryData(topPotsQuery()),
      context.queryClient.ensureQueryData(yearStatsQuery(year)),
    ]);
  },
  component: DashboardPage,
});
