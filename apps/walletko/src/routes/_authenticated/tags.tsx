import { createFileRoute } from "@tanstack/react-router";
import { TAGS_PAGE_SIZE, tagsPagedQuery } from "src/features/tags/queries";
import { TagsPage } from "src/features/tags/tags-page";

export const Route = createFileRoute("/_authenticated/tags")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tagsPagedQuery(1, TAGS_PAGE_SIZE),
    );
  },
  component: TagsPage,
});
