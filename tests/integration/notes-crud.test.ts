import request from "supertest";
import { z } from "zod";
import { createApp } from "../helpers/createApp";
import { signUpAndSignIn } from "../helpers/auth";
import {
  NoteListItemSchema,
  NoteSchema,
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

describe("notes CRUD: auth gate", () => {
  it("GET /api/notes returns 401 without a session cookie", async () => {
    const res = await request(app).get("/api/notes");
    expect(res.status).toBe(401);
  });

  it("POST /api/notes returns 401 without a session cookie", async () => {
    const res = await request(app).post("/api/notes").send({});
    expect(res.status).toBe(401);
  });

  it("GET /api/notes/:id returns 401 without a session cookie", async () => {
    const res = await request(app).get("/api/notes/anything");
    expect(res.status).toBe(401);
  });

  it("PUT /api/notes/:id returns 401 without a session cookie", async () => {
    const res = await request(app).put("/api/notes/anything").send({});
    expect(res.status).toBe(401);
  });

  it("DELETE /api/notes/:id returns 401 without a session cookie", async () => {
    const res = await request(app).delete("/api/notes/anything");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/notes", () => {
  it("creates a note and returns 201 with a NoteSchema-shaped body", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const res = await agent.post("/api/notes").send({
      title: "Hello",
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    });
    expect(res.status).toBe(201);
    const note = NoteSchema.parse(res.body);
    expect(note.title).toBe("Hello");
    expect(note.isPublic).toBe(false);
    expect(note.publicSlug).toBeNull();
  });

  it("creates a default note when body is empty", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const res = await agent.post("/api/notes").send({});
    expect(res.status).toBe(201);
    const note = NoteSchema.parse(res.body);
    expect(note.title).toBe("Untitled note");
    expect(note.contentJson).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});

describe("GET /api/notes (list)", () => {
  it("returns only the current user's notes", async () => {
    const agentA = await signUpAndSignIn(app, userA);
    const agentB = await signUpAndSignIn(app, userB);

    await agentA.post("/api/notes").send({ title: "A1" });
    await agentA.post("/api/notes").send({ title: "A2" });
    await agentB.post("/api/notes").send({ title: "B1" });

    const res = await agentA.get("/api/notes");
    expect(res.status).toBe(200);
    const list = z.array(NoteListItemSchema).parse(res.body);
    expect(list).toHaveLength(2);
    const titles = list.map((n) => n.title).sort();
    expect(titles).toEqual(["A1", "A2"]);
  });
});

describe("GET /api/notes/:id", () => {
  it("returns the note for its owner", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (
      await agent.post("/api/notes").send({ title: "Mine" })
    ).body;
    const res = await agent.get(`/api/notes/${created.id}`);
    expect(res.status).toBe(200);
    expect(NoteSchema.parse(res.body).title).toBe("Mine");
  });

  it("returns 404 for another user's note", async () => {
    const agentA = await signUpAndSignIn(app, userA);
    const agentB = await signUpAndSignIn(app, userB);
    const created = (await agentA.post("/api/notes").send({})).body;
    const res = await agentB.get(`/api/notes/${created.id}`);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/notes/:id", () => {
  it("updates title and bumps updatedAt", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (
      await agent.post("/api/notes").send({ title: "Old" })
    ).body;

    await new Promise((r) => setTimeout(r, 10));

    const res = await agent
      .put(`/api/notes/${created.id}`)
      .send({ title: "New" });
    expect(res.status).toBe(200);
    const updated = NoteSchema.parse(res.body);
    expect(updated.title).toBe("New");
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("returns 400 for invalid contentJson", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (await agent.post("/api/notes").send({})).body;
    const res = await agent
      .put(`/api/notes/${created.id}`)
      .send({ contentJson: { type: "paragraph" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 404 for another user's note", async () => {
    const agentA = await signUpAndSignIn(app, userA);
    const agentB = await signUpAndSignIn(app, userB);
    const created = (await agentA.post("/api/notes").send({})).body;
    const res = await agentB
      .put(`/api/notes/${created.id}`)
      .send({ title: "hijack" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/notes/:id", () => {
  it("returns 204 and the note is gone afterwards", async () => {
    const agent = await signUpAndSignIn(app, userA);
    const created = (await agent.post("/api/notes").send({})).body;

    const del = await agent.delete(`/api/notes/${created.id}`);
    expect(del.status).toBe(204);

    const get = await agent.get(`/api/notes/${created.id}`);
    expect(get.status).toBe(404);
  });

  it("returns 404 for another user's note", async () => {
    const agentA = await signUpAndSignIn(app, userA);
    const agentB = await signUpAndSignIn(app, userB);
    const created = (await agentA.post("/api/notes").send({})).body;

    const res = await agentB.delete(`/api/notes/${created.id}`);
    expect(res.status).toBe(404);
  });
});
