import request from "supertest";
import { createApp } from "../helpers/createApp";
import { signUpAndSignIn } from "../helpers/auth";

const app = createApp();

const user = {
  email: "alice@example.com",
  password: "password123",
  name: "Alice",
};

describe("auth", () => {
  it("sign-up with valid credentials returns 200 and sets a session cookie", async () => {
    const res = await request(app).post("/api/auth/sign-up/email").send(user);
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("sign-up with a weak password returns 4xx", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ ...user, password: "short" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("sign-in with valid credentials returns 200 and sets a cookie", async () => {
    await request(app).post("/api/auth/sign-up/email").send(user);

    const res = await request(app).post("/api/auth/sign-in/email").send({
      email: user.email,
      password: user.password,
    });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("sign-in with wrong password returns 4xx", async () => {
    await request(app).post("/api/auth/sign-up/email").send(user);

    const res = await request(app).post("/api/auth/sign-in/email").send({
      email: user.email,
      password: "wrongpassword",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("sign-out succeeds for an authenticated agent", async () => {
    const agent = await signUpAndSignIn(app, user);
    const res = await agent.post("/api/auth/sign-out");
    expect(res.status).toBe(200);
  });
});

describe("requireAuth (via /api/_test/me probe)", () => {
  it("returns 401 with no session cookie", async () => {
    const res = await request(app).get("/api/_test/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with the current user when authenticated", async () => {
    const agent = await signUpAndSignIn(app, user);
    const res = await agent.get("/api/_test/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body.name).toBe(user.name);
    expect(typeof res.body.id).toBe("string");
  });
});
