import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireDatabaseUrl } from "../env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | undefined;
let sql: ReturnType<typeof postgres> | undefined;

export function getDb(): Database {
  if (cached) return cached;
  const url = requireDatabaseUrl();
  sql = postgres(url, { max: 1, prepare: false });
  cached = drizzle(sql, { schema });
  return cached;
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = undefined;
    cached = undefined;
  }
}
