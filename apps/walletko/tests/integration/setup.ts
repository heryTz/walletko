import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

export const URL_FILE = path.join(os.tmpdir(), "walletko-integration-db-url");

export default async function setup() {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  (global as unknown as { __PG_CONTAINER__: unknown }).__PG_CONTAINER__ =
    container;
  fs.writeFileSync(URL_FILE, container.getConnectionUri());
}

export async function teardown() {
  const container = (
    global as unknown as { __PG_CONTAINER__: { stop: () => Promise<void> } }
  ).__PG_CONTAINER__;
  if (container) {
    await container.stop();
  }
  if (fs.existsSync(URL_FILE)) {
    fs.unlinkSync(URL_FILE);
  }
}
