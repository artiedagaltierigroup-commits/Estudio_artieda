import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections during hot reload in development
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

const connection =
  globalForDb.connection ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false, // Required for Supabase transaction pooler
  });

if (process.env.NODE_ENV !== "production") globalForDb.connection = connection;

export const db = drizzle(connection, { schema });
