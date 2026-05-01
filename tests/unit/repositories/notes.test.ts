import { nanoid } from "nanoid";
import { db } from "../../../src/db/prisma";
import {
  createNote,
  deleteNote,
  getNoteById,
  getNoteByPublicSlug,
  getNotesByUser,
  setNotePublic,
  updateNote,
} from "../../../src/repositories/notes";

async function makeUser(label = "user") {
  const id = `${label}-${nanoid(8)}`;
  return db.user.create({
    data: {
      id,
      name: label,
      email: `${id}@example.com`,
      emailVerified: false,
    },
  });
}

describe("repositories/notes", () => {
  describe("createNote", () => {
    it("defaults title to 'Untitled note' when missing or empty", async () => {
      const user = await makeUser();
      const a = await createNote(user.id);
      const b = await createNote(user.id, { title: "   " });
      expect(a.title).toBe("Untitled note");
      expect(b.title).toBe("Untitled note");
    });

    it("defaults contentJson to an empty TipTap doc", async () => {
      const user = await makeUser();
      const note = await createNote(user.id);
      expect(note.contentJson).toEqual({
        type: "doc",
        content: [{ type: "paragraph" }],
      });
    });

    it("accepts a custom title and content", async () => {
      const user = await makeUser();
      const doc = { type: "doc", content: [{ type: "heading" }] };
      const note = await createNote(user.id, {
        title: "Hello",
        contentJson: doc,
      });
      expect(note.title).toBe("Hello");
      expect(note.contentJson).toEqual(doc);
    });
  });

  describe("getNoteById (cross-user isolation)", () => {
    it("returns null when the note belongs to another user", async () => {
      const userA = await makeUser("a");
      const userB = await makeUser("b");
      const note = await createNote(userA.id);

      expect(await getNoteById(userB.id, note.id)).toBeNull();
      expect(await getNoteById(userA.id, note.id)).not.toBeNull();
    });
  });

  describe("getNotesByUser", () => {
    it("returns only the requesting user's notes, sorted by updatedAt desc", async () => {
      const userA = await makeUser("a");
      const userB = await makeUser("b");

      await createNote(userA.id, { title: "older" });
      await new Promise((r) => setTimeout(r, 10));
      const newer = await createNote(userA.id, { title: "newer" });
      await createNote(userB.id, { title: "B's note" });

      const list = await getNotesByUser(userA.id);
      expect(list).toHaveLength(2);
      expect(list[0]?.id).toBe(newer.id);
      expect(list[0]?.title).toBe("newer");
      expect(list[1]?.title).toBe("older");
    });
  });

  describe("updateNote", () => {
    it("returns null when the note belongs to another user", async () => {
      const userA = await makeUser("a");
      const userB = await makeUser("b");
      const note = await createNote(userA.id);

      const result = await updateNote(userB.id, note.id, { title: "hijack" });
      expect(result).toBeNull();

      const fresh = await getNoteById(userA.id, note.id);
      expect(fresh?.title).toBe("Untitled note");
    });

    it("bumps updatedAt", async () => {
      const user = await makeUser();
      const note = await createNote(user.id);
      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateNote(user.id, note.id, { title: "changed" });
      expect(updated).not.toBeNull();
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(
        note.updatedAt.getTime(),
      );
    });

    it("normalises an empty title to 'Untitled note'", async () => {
      const user = await makeUser();
      const note = await createNote(user.id, { title: "Real" });
      const updated = await updateNote(user.id, note.id, { title: "  " });
      expect(updated?.title).toBe("Untitled note");
    });
  });

  describe("deleteNote", () => {
    it("returns true on owned note and false otherwise", async () => {
      const userA = await makeUser("a");
      const userB = await makeUser("b");
      const note = await createNote(userA.id);

      expect(await deleteNote(userB.id, note.id)).toBe(false);
      expect(await getNoteById(userA.id, note.id)).not.toBeNull();

      expect(await deleteNote(userA.id, note.id)).toBe(true);
      expect(await getNoteById(userA.id, note.id)).toBeNull();
    });

    it("returns false for a non-existent note id", async () => {
      const user = await makeUser();
      expect(await deleteNote(user.id, "does-not-exist")).toBe(false);
    });
  });

  describe("setNotePublic", () => {
    it("generates a 16-char slug when going public", async () => {
      const user = await makeUser();
      const note = await createNote(user.id);

      const updated = await setNotePublic(user.id, note.id, true);
      expect(updated?.isPublic).toBe(true);
      expect(updated?.publicSlug).toMatch(/^.{16}$/);
    });

    it("does not regenerate the slug when called twice", async () => {
      const user = await makeUser();
      const note = await createNote(user.id);

      const first = await setNotePublic(user.id, note.id, true);
      const second = await setNotePublic(user.id, note.id, true);
      expect(second?.publicSlug).toBe(first?.publicSlug);
    });

    it("clears the slug when going private", async () => {
      const user = await makeUser();
      const note = await createNote(user.id);

      await setNotePublic(user.id, note.id, true);
      const reverted = await setNotePublic(user.id, note.id, false);

      expect(reverted?.isPublic).toBe(false);
      expect(reverted?.publicSlug).toBeNull();
    });

    it("returns null when toggling a note owned by another user", async () => {
      const userA = await makeUser("a");
      const userB = await makeUser("b");
      const note = await createNote(userA.id);

      expect(await setNotePublic(userB.id, note.id, true)).toBeNull();
    });
  });

  describe("getNoteByPublicSlug", () => {
    it("returns null when isPublic is false even if the slug matches", async () => {
      const user = await makeUser();
      const note = await createNote(user.id);
      const made = await setNotePublic(user.id, note.id, true);
      const slug = made!.publicSlug!;

      expect(await getNoteByPublicSlug(slug)).not.toBeNull();

      await setNotePublic(user.id, note.id, false);
      expect(await getNoteByPublicSlug(slug)).toBeNull();
    });

    it("returns null for an unknown slug", async () => {
      expect(await getNoteByPublicSlug("nope")).toBeNull();
    });
  });
});
