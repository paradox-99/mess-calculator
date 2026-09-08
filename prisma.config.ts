import path from "node:path";

import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env on its own, and the CLI runs outside Next's
// env loading. Node's own loader covers it.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // No .env locally (CI, production) — the real environment already has it.
}

// Prisma 7 reads the connection URL from here (not from schema.prisma) for
// migrate/introspect. The running app gets its connection through the pg
// driver adapter in src/lib/prisma.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Read straight from the environment rather than Prisma's `env()` helper,
    // which throws when the variable is missing. `prisma generate` doesn't need
    // a database, and it runs on `npm install` — before anyone has copied
    // .env.example. The migrate commands still fail loudly if it's unset.
    url: process.env.DATABASE_URL,
  },
});
