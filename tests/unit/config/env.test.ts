import { loadEnv } from "../../../src/config/env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
  CLIENT_URL: "http://localhost:5173",
  PORT: "3001",
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

describe("loadEnv", () => {
  it("accepts a valid environment", () => {
    const env = loadEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe("test");
  });

  it("rejects missing DATABASE_URL", () => {
    const { DATABASE_URL: _, ...rest } = valid;
    expect(() => loadEnv(rest)).toThrow();
  });

  it("rejects short BETTER_AUTH_SECRET", () => {
    expect(() =>
      loadEnv({ ...valid, BETTER_AUTH_SECRET: "short" }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects malformed BETTER_AUTH_URL", () => {
    expect(() => loadEnv({ ...valid, BETTER_AUTH_URL: "not-a-url" })).toThrow();
  });

  it("coerces PORT to a number", () => {
    const env = loadEnv({ ...valid, PORT: "4000" });
    expect(env.PORT).toBe(4000);
    expect(typeof env.PORT).toBe("number");
  });

  it("defaults PORT to 3001 when missing", () => {
    const { PORT: _, ...rest } = valid;
    const env = loadEnv(rest);
    expect(env.PORT).toBe(3001);
  });

  it("defaults NODE_ENV to development when missing", () => {
    const { NODE_ENV: _, ...rest } = valid;
    const env = loadEnv(rest);
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects invalid NODE_ENV value", () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: "staging" })).toThrow();
  });
});
