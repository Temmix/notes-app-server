import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export default async function setup(): Promise<void> {
  const envFile = resolve(process.cwd(), ".env.test");
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const url = process.env.DATABASE_URL ?? "";
  if (!url.endsWith("_test")) {
    throw new Error(
      `globalSetup: refusing to run — DATABASE_URL must end in "_test". Got "${url || "(unset)"}"`,
    );
  }

  console.info("[globalSetup] applying migrations to test DB");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
