import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
      "scripts/**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
      "tests/**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
    ],
  },
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
  },
});
