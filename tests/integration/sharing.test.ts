import request from "supertest";
import { createApp } from "../helpers/createApp";
import { signUpAndSignIn } from "../helpers/auth";
import {
  PublicNoteSchema,
  ShareResponseSchema,
} from "../../src/schemas/notes";

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

describe("POST /api/notes/:id/share", () => {
  it("toggling public returns slug and the public URL serves the note", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (
      await agent.post("/api/notes").send({ title: "X" })
    ).body;

    const share = await agent
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: true });
    expect(share.status).toBe(200);
    const sr = ShareResponseSchema.parse(share.body);
    expect(sr.isPublic).toBe(true);
    expect(sr.publicSlug).toMatch(/^.{16}$/);

    const pub = await request(app).get(`/api/public-notes/${sr.publicSlug}`);
    expect(pub.status).toBe(200);
    const pn = PublicNoteSchema.parse(pub.body);
    expect(pn.title).toBe("X");
  });

  it("toggling private clears slug and old slug 404s", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (
      await agent.post("/api/notes").send({ title: "X" })
    ).body;

    const share = await agent
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: true });
    const slug = share.body.publicSlug as string;

    const unshare = await agent
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: false });
    expect(unshare.status).toBe(200);
    expect(unshare.body.publicSlug).toBeNull();

    const pub = await request(app).get(`/api/public-notes/${slug}`);
    expect(pub.status).toBe(404);
  });

  it("public response includes only title, contentJson, updatedAt (no id/userId/isPublic)", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (await agent.post("/api/notes").send({})).body;
    const share = await agent
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: true });
    const slug = share.body.publicSlug as string;

    const pub = await request(app).get(`/api/public-notes/${slug}`);
    expect(pub.status).toBe(200);
    expect(Object.keys(pub.body).sort()).toEqual([
      "contentJson",
      "title",
      "updatedAt",
    ]);
  });

  it("sharing another user's note returns 404", async () => {
    const agentA = await signUpAndSignIn(app, userA);
    const agentB = await signUpAndSignIn(app, userB);
    const created = (await agentA.post("/api/notes").send({})).body;

    const res = await agentB
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: true });
    expect(res.status).toBe(404);
  });

  it("returns 401 without a session cookie", async () => {
    const res = await request(app)
      .post("/api/notes/anything/share")
      .send({ isPublic: true });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid body with 400", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (await agent.post("/api/notes").send({})).body;
    const res = await agent
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: "yes" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/public-notes/:slug", () => {
  it("returns 404 for an unknown slug", async () => {
    const res = await request(app).get("/api/public-notes/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("does not require a session cookie", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (
      await agent.post("/api/notes").send({ title: "Public note" })
    ).body;
    const share = await agent
      .post(`/api/notes/${created.id}/share`)
      .send({ isPublic: true });
    const slug = share.body.publicSlug as string;

    const res = await request(app).get(`/api/public-notes/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Public note");
  });
});
