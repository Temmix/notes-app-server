import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/db/prisma";

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

export async function truncateAll(): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "notes", "session", "account", "verification", "user" RESTART IDENTITY CASCADE',
  );
}

afterEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await db.$disconnect();
});
