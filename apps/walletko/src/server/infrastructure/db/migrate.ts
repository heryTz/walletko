import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const migrationsFolder = path.join(import.meta.dirname, "migrations");

const pool = new Pool({ connectionString });

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log(`Migrations applied from ${migrationsFolder}`);
} finally {
  await pool.end();
}
