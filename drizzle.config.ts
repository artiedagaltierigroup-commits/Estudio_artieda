import type { Config } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL ??
      process.env.DIRECT_URL!,
  },
} satisfies Config;
