import request from "supertest";
import { createApp } from "../helpers/createApp";
import { env } from "../../src/config/env";

const app = createApp();

describe("CORS preflight", () => {
  it("returns ACAO + ACAC:true for an allowed origin", async () => {
    const res = await request(app)
      .options("/api/notes")
      .set("Origin", env.CLIENT_URL)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "content-type");

    expect(res.headers["access-control-allow-origin"]).toBe(env.CLIENT_URL);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not return ACAO for a non-allowed origin", async () => {
    const res = await request(app)
      .options("/api/notes")
      .set("Origin", "http://evil.example.com")
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
