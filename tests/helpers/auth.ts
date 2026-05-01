import request, { type Agent } from "supertest";
import type { Express } from "express";

export interface TestUserCreds {
  email: string;
  password: string;
  name: string;
}

/**
 * Signs up a user and returns a supertest agent with the session cookie attached.
 * Subsequent requests on the agent are authenticated.
 */
export async function signUpAndSignIn(
  app: Express,
  user: TestUserCreds,
): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/sign-up/email")
    .send(user)
    .set("content-type", "application/json");
  if (res.status >= 400) {
    throw new Error(
      `signUpAndSignIn failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return agent;
}
