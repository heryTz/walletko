import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { applyFinanceSchema, applyWalletkoSchema } from "./test-helpers";

let financeContainer: StartedPostgreSqlContainer;
let walletkoContainer: StartedPostgreSqlContainer;
let financeUrl: string;
let walletkoUrl: string;
let finance: pg.Client;
let walletko: pg.Client;

const insertUser = async (id: string): Promise<void> => {
  await finance.query(
    `INSERT INTO "User"(id,email,name,"emailVerified",image,"createdAt","updatedAt")
     VALUES($1,$2,$3,true,NULL,now(),now())`,
    [id, `${id}@example.com`, id],
  );
};

const insertOperation = async (params: {
  id: string;
  amount: string;
  type: string;
  userId: string | null;
}): Promise<void> => {
  await finance.query(
    `INSERT INTO "Operation"(id,label,amount,type,"userId","createdAt","updatedAt")
     VALUES($1,$2,$3,$4,$5,now(),NULL)`,
    [params.id, params.id, params.amount, params.type, params.userId],
  );
};

const count = async (client: pg.Client, table: string): Promise<number> => {
  const result = await client.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM ${table}`,
  );
  return result.rows[0].n;
};

beforeAll(async () => {
  [financeContainer, walletkoContainer] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine").start(),
    new PostgreSqlContainer("postgres:16-alpine").start(),
  ]);
  financeUrl = financeContainer.getConnectionUri();
  walletkoUrl = walletkoContainer.getConnectionUri();
  finance = new pg.Client({ connectionString: financeUrl });
  walletko = new pg.Client({ connectionString: walletkoUrl });
  await finance.connect();
  await walletko.connect();
  await applyFinanceSchema(finance);
  await applyWalletkoSchema(walletko);
}, 120_000);

afterEach(async () => {
  await finance.query(
    `TRUNCATE "Operation","Tag","_OperationToTag","User" CASCADE`,
  );
  await walletko.query(
    `TRUNCATE transactions,pot_allocations,expense_allocations,transaction_tags,tags,pots,"user" CASCADE`,
  );
});

afterAll(async () => {
  await finance?.end();
  await walletko?.end();
  await Promise.all([financeContainer?.stop(), walletkoContainer?.stop()]);
});

describe("migrate: data validation", () => {
  it("migrates an MGA-scale amount above the former int32 cents ceiling", async () => {
    await insertUser("user-mga");
    await insertOperation({
      id: "op-mga",
      amount: "34000000.00",
      type: "revenue",
      userId: "user-mga",
    });

    await migrate({ financeUrl, walletkoUrl });

    const transaction = await walletko.query<{ amount: string }>(
      `SELECT amount::text AS amount FROM transactions WHERE id = $1`,
      ["op-mga"],
    );
    expect(transaction.rows[0].amount).toBe("3400000000");

    const allocated = await walletko.query<{ amount: string }>(
      `SELECT amount::text AS amount FROM pot_allocations WHERE transaction_id = $1`,
      ["op-mga"],
    );
    expect(allocated.rows[0].amount).toBe("3400000000");
  });

  it("migrates the largest amount the finance schema can hold", async () => {
    await insertUser("user-max");
    await insertOperation({
      id: "op-max",
      amount: "99999999.99",
      type: "revenue",
      userId: "user-max",
    });

    await migrate({ financeUrl, walletkoUrl });

    const transaction = await walletko.query<{ amount: string }>(
      `SELECT amount::text AS amount FROM transactions WHERE id = $1`,
      ["op-max"],
    );
    expect(transaction.rows[0].amount).toBe("9999999999");
  });

  it("aborts on an unexpected operation type", async () => {
    await insertUser("user-badtype");
    await insertOperation({
      id: "op-badtype",
      amount: "10.00",
      type: "transfer",
      userId: "user-badtype",
    });

    await expect(migrate({ financeUrl, walletkoUrl })).rejects.toThrow(
      /unexpected type/,
    );
    expect(await count(walletko, "transactions")).toBe(0);
  });

  it("skips operations whose userId has no matching user", async () => {
    await insertOperation({
      id: "op-orphan-user",
      amount: "10.00",
      type: "revenue",
      userId: "ghost-user",
    });

    const summary = await migrate({ financeUrl, walletkoUrl });
    expect(summary.skippedOperations).toBe(1);
    expect(await count(walletko, "transactions")).toBe(0);
  });

  it("surfaces a labeled error when the finance database is unreachable", async () => {
    await expect(
      migrate({
        financeUrl: "postgres://user:pass@127.0.0.1:1/finance",
        walletkoUrl,
      }),
    ).rejects.toThrow(/Failed to connect to the finance database/);
  });
});
