import express, { type Express } from "express";
import request from "supertest";
import { z } from "zod";
import { errorHandler, HttpError } from "../../src/errors";

function makeStubApp(): Express {
  const app = express();
  app.use(express.json());

  app.get("/zod", () => {
    z.string().parse(123);
  });

  app.get("/http", () => {
    throw new HttpError(403, "forbidden");
  });

  app.get("/unknown", () => {
    throw new Error("boom internal secret");
  });

  app.get("/async-zod", async () => {
    z.object({ a: z.string() }).parse({ a: 1 });
  });

  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("maps ZodError to 400 with issues", async () => {
    const res = await request(makeStubApp()).get("/zod");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it("propagates ZodError thrown inside an async handler", async () => {
    const res = await request(makeStubApp()).get("/async-zod");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("maps HttpError to its status with its message", async () => {
    const res = await request(makeStubApp()).get("/http");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
  });

  it("maps unknown errors to 500 with a generic message and logs the real error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await request(makeStubApp()).get("/unknown");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
      expect(JSON.stringify(res.body)).not.toContain("boom internal secret");
      expect(spy).toHaveBeenCalled();
      const loggedRealError = spy.mock.calls.some((call) =>
        call.some(
          (arg) =>
            arg instanceof Error && arg.message === "boom internal secret",
        ),
      );
      expect(loggedRealError).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
