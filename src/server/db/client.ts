import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Supabase's transaction pooler can't keep prepared statements between requests.
const globalForDb = globalThis as unknown as { codelineSql?: ReturnType<typeof postgres> };
const sql = globalForDb.codelineSql ?? postgres(url, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.codelineSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
