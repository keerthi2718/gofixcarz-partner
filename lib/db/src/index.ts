import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Re-export drizzle query helpers so consumers always use the same
// drizzle-orm instance as the db/schema, avoiding peer-dep type conflicts.
export { eq, and, or, desc, asc, sql, inArray, isNull, isNotNull } from "drizzle-orm";

export * from "./schema/index.js";
