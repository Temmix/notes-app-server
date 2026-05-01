import { createApp } from "../helpers/createApp";
import { signUpAndSignIn } from "../helpers/auth";

const app = createApp();

const userA = {
  email: "alice@example.com",
  password: "password123",
  name: "Alice",
};
const userB = {
  email: "bob@example.com",
  password: "password123",
  name: "Bob",
};

describe("cross-user authorization", () => {
  it("returns 404 (never 200 or 403) on every owner-scoped endpoint", async () => {
    const agentA = await signUpAndSignIn(app, userA);
    const agentB = await signUpAndSignIn(app, userB);
    const created = (await agentA.post("/api/notes").send({ title: "A" })).body;

    const get = await agentB.get(`/api/notes/${created.id}`);
    expect(get.status).toBe(404);

    const put = await agentB
      .put(`/api/notes/${created.id}`)
      .send({ title: "hijack" });
    expect(put.status).toBe(404);

    const share = await agentB
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: true });
    expect(share.status).toBe(404);

    const del = await agentB.delete(`/api/notes/${created.id}`);
    expect(del.status).toBe(404);

    // Owner's note must still be intact and unmodified
    const ownerView = await agentA.get(`/api/notes/${created.id}`);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.title).toBe("A");
    expect(ownerView.body.isPublic).toBe(false);
  });
});
