import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import type {
  NameSuggestionDTO,
  SuggestibleTransactionType,
} from "src/server/contracts/transaction";
import type { DrizzleDb } from "src/server/infrastructure/db/client";
import {
  tags,
  transactions,
  transactionTags,
} from "src/server/infrastructure/db/schema";

export type SearchNameSuggestionsParams = {
  type: SuggestibleTransactionType;
  search: string;
};

const SUGGESTION_LIMIT = 8;

export class DrizzleSearchNameSuggestionsQuery {
  constructor(private readonly db: DrizzleDb) {}

  async execute(
    userId: string,
    { type, search }: SearchNameSuggestionsParams,
  ): Promise<NameSuggestionDTO[]> {
    const filters = [
      eq(transactions.userId, userId),
      eq(transactions.type, type),
    ];

    if (search) {
      filters.push(ilike(transactions.name, `%${search}%`));
    }

    const latestPerName = this.db
      .selectDistinctOn([transactions.name], {
        id: transactions.id,
        name: transactions.name,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(and(...filters))
      .orderBy(
        transactions.name,
        desc(transactions.createdAt),
        desc(transactions.id),
      )
      .as("latest_per_name");

    const rows = await this.db
      .select({ id: latestPerName.id, name: latestPerName.name })
      .from(latestPerName)
      .orderBy(desc(latestPerName.createdAt), desc(latestPerName.id))
      .limit(SUGGESTION_LIMIT);

    const ids = rows.map((row) => row.id);
    const tagRows =
      ids.length > 0
        ? await this.db
            .select({
              transactionId: transactionTags.transactionId,
              tagId: tags.id,
              tagName: tags.name,
            })
            .from(transactionTags)
            .innerJoin(
              tags,
              and(eq(transactionTags.tagId, tags.id), eq(tags.userId, userId)),
            )
            .where(inArray(transactionTags.transactionId, ids))
        : [];

    const tagsByTransaction = new Map<string, { id: string; name: string }[]>();
    for (const row of tagRows) {
      if (!tagsByTransaction.has(row.transactionId)) {
        tagsByTransaction.set(row.transactionId, []);
      }
      tagsByTransaction
        .get(row.transactionId)
        ?.push({ id: row.tagId, name: row.tagName });
    }

    return rows.map((row) => ({
      name: row.name,
      tags: tagsByTransaction.get(row.id) ?? [],
    }));
  }
}
