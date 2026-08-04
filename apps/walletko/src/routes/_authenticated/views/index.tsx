import { createFileRoute } from "@tanstack/react-router";
import { tagsQuery } from "src/features/tags/queries";
import { viewsQuery } from "src/features/views/queries";
import { ViewsPage } from "src/features/views/views-page";

export const Route = createFileRoute("/_authenticated/views/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(viewsQuery),
      context.queryClient.ensureQueryData(tagsQuery),
    ]);
  },
  component: ViewsPage,
});
