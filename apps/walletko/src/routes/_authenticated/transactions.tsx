import { createFileRoute } from "@tanstack/react-router";
import { tagsQuery } from "src/features/tags/queries";
import { transactionsQuery } from "src/features/transactions/queries";
import { TransactionsPage } from "src/features/transactions/transactions-page";
import { z } from "zod";

const transactionsSearchSchema = z.object({
  types: z.array(z.string()).default([]),
  name: z.string().default(""),
  tagIds: z.array(z.string()).default([]),
  page: z.number().int().positive().default(1),
});

export const Route = createFileRoute("/_authenticated/transactions")({
  validateSearch: (search) => transactionsSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        transactionsQuery({
          types: deps.types,
          name: deps.name,
          tagIds: deps.tagIds,
          page: deps.page,
        }),
      ),
      context.queryClient.ensureQueryData(tagsQuery),
    ]);
  },
  component: TransactionsPage,
});
