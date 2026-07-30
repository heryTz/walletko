import { createId } from "@paralleldrive/cuid2";
import { DrizzleSearchNameSuggestionsQuery } from "src/server/infrastructure/transaction/drizzle-search-name-suggestions.query";
import { createTestDb, type TestDb } from "tests/integration/helpers/db";
import {
  insertTag,
  insertTransaction,
  insertTransactionTag,
} from "tests/integration/helpers/fixtures";
import { truncateAll } from "tests/integration/helpers/truncate";

describe("DrizzleSearchNameSuggestionsQuery", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;
  let query: DrizzleSearchNameSuggestionsQuery;

  beforeAll(async () => {
    ({ db, cleanup } = await createTestDb(
      `test_name_suggestions_${createId()}`,
    ));
    query = new DrizzleSearchNameSuggestionsQuery(db);
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  describe("userId isolation", () => {
    it("never returns another user's names", async () => {
      const userA = createId();
      const userB = createId();
      await insertTransaction(db, {
        userId: userB,
        overrides: { type: "income", name: "Other User Salary" },
      });

      const results = await query.execute(userA, {
        type: "income",
        search: "",
      });

      expect(results).toEqual([]);
    });
  });

  describe("type scoping", () => {
    it("returns only names of the requested type", async () => {
      const userId = createId();
      await insertTransaction(db, {
        userId,
        overrides: { type: "income", name: "Salary" },
      });
      await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Groceries" },
      });

      const income = await query.execute(userId, {
        type: "income",
        search: "",
      });
      const expense = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(income.map((r) => r.name)).toEqual(["Salary"]);
      expect(expense.map((r) => r.name)).toEqual(["Groceries"]);
    });

    it("excludes transfers, canceled transactions and cancellation entries", async () => {
      const userId = createId();
      for (const type of [
        "transfer",
        "canceled_income",
        "canceled_expense",
        "income_cancellation",
        "expense_cancellation",
      ] as const) {
        await insertTransaction(db, {
          userId,
          overrides: { type, name: `Hidden ${type}` },
        });
      }

      const income = await query.execute(userId, {
        type: "income",
        search: "",
      });
      const expense = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(income).toEqual([]);
      expect(expense).toEqual([]);
    });
  });

  describe("distinct names", () => {
    it("collapses repeated names to a single entry", async () => {
      const userId = createId();
      await insertTransaction(db, {
        userId,
        overrides: {
          type: "expense",
          name: "Groceries",
          createdAt: new Date("2024-01-01"),
        },
      });
      await insertTransaction(db, {
        userId,
        overrides: {
          type: "expense",
          name: "Groceries",
          createdAt: new Date("2024-06-01"),
        },
      });

      const results = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Groceries");
    });

    it("carries the tags of the most recent occurrence", async () => {
      const userId = createId();
      const food = await insertTag(db, { userId, overrides: { name: "food" } });
      const weekly = await insertTag(db, {
        userId,
        overrides: { name: "weekly" },
      });

      const older = await insertTransaction(db, {
        userId,
        overrides: {
          type: "expense",
          name: "Groceries",
          createdAt: new Date("2024-01-01"),
        },
      });
      const newer = await insertTransaction(db, {
        userId,
        overrides: {
          type: "expense",
          name: "Groceries",
          createdAt: new Date("2024-06-01"),
        },
      });
      await insertTransactionTag(db, {
        transactionId: older.id,
        tagId: food.id,
      });
      await insertTransactionTag(db, {
        transactionId: newer.id,
        tagId: weekly.id,
      });

      const results = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(results[0].tags).toEqual([{ id: weekly.id, name: "weekly" }]);
    });

    it("returns an empty tags array when the newest occurrence has no tags", async () => {
      const userId = createId();
      await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Groceries" },
      });

      const results = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(results[0].tags).toEqual([]);
    });
  });

  describe("empty search", () => {
    it("returns the most recently used names first", async () => {
      const userId = createId();
      await insertTransaction(db, {
        userId,
        overrides: {
          type: "expense",
          name: "Rent",
          createdAt: new Date("2024-01-01"),
        },
      });
      await insertTransaction(db, {
        userId,
        overrides: {
          type: "expense",
          name: "Groceries",
          createdAt: new Date("2024-06-01"),
        },
      });

      const results = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(results.map((r) => r.name)).toEqual(["Groceries", "Rent"]);
    });

    it("caps the result set at 8 names", async () => {
      const userId = createId();
      for (let i = 0; i < 12; i++) {
        await insertTransaction(db, {
          userId,
          overrides: {
            type: "expense",
            name: `Expense ${i}`,
            createdAt: new Date(2024, 0, i + 1),
          },
        });
      }

      const results = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(results).toHaveLength(8);
      expect(results[0].name).toBe("Expense 11");
    });
  });

  describe("ordering ties", () => {
    it("breaks a createdAt tie deterministically by id", async () => {
      const userId = createId();
      const createdAt = new Date("2024-03-01");
      const alpha = await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Alpha", createdAt },
      });
      const beta = await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Beta", createdAt },
      });
      const gamma = await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Gamma", createdAt },
      });

      const expectedOrder = [alpha, beta, gamma]
        .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
        .map((t) => t.name);

      const first = await query.execute(userId, {
        type: "expense",
        search: "",
      });
      const second = await query.execute(userId, {
        type: "expense",
        search: "",
      });

      expect(first.map((r) => r.name)).toEqual(expectedOrder);
      expect(second.map((r) => r.name)).toEqual(expectedOrder);
    });
  });

  describe("search", () => {
    it("matches case-insensitively on a substring", async () => {
      const userId = createId();
      await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Grocery Shopping" },
      });
      await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Rent" },
      });

      const results = await query.execute(userId, {
        type: "expense",
        search: "cery",
      });

      expect(results.map((r) => r.name)).toEqual(["Grocery Shopping"]);
    });

    it("returns nothing when no name matches", async () => {
      const userId = createId();
      await insertTransaction(db, {
        userId,
        overrides: { type: "expense", name: "Rent" },
      });

      const results = await query.execute(userId, {
        type: "expense",
        search: "zzz",
      });

      expect(results).toEqual([]);
    });
  });
});
