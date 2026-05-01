import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.test");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const url = process.env.DATABASE_URL ?? "";
if (!url.endsWith("_test")) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL must end in "_test". ` +
      `Got "${url || "(unset)"}". ` +
      `Configure .env.test or set DATABASE_URL explicitly.`,
  );
}

// TODO (Phase 3): once prisma/schema.prisma exists, run migrations and wire truncateAll().
// For now setup just guards the env and keeps tests/setup runnable.

afterEach(async () => {
  // Phase 3 will replace this with truncateAll() against the test DB.
});
