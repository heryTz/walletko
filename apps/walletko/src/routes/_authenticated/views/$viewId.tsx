import { createFileRoute } from "@tanstack/react-router";
import { tagsQuery } from "src/features/tags/queries";
import {
  viewQuery,
  viewStatsQuery,
  viewYearStatsQuery,
} from "src/features/views/queries";
import { ViewDetailPage } from "src/features/views/view-detail-page";

export const Route = createFileRoute("/_authenticated/views/$viewId")({
  loader: async ({ context, params: { viewId } }) => {
    const year = new Date().getFullYear();
    await Promise.all([
      context.queryClient.ensureQueryData(viewQuery(viewId)),
      context.queryClient.ensureQueryData(viewStatsQuery(viewId)),
      context.queryClient.ensureQueryData(viewYearStatsQuery(viewId, year)),
      context.queryClient.ensureQueryData(tagsQuery),
    ]);
  },
  component: ViewDetailPage,
});
