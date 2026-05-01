import {
  CreateNoteRequestSchema,
  NoteSchema,
  PublicNoteSchema,
  ShareRequestSchema,
  ShareResponseSchema,
  TipTapDocSchema,
  UpdateNoteRequestSchema,
} from "../../../src/schemas/notes";

const sampleNote = {
  id: "note-id",
  userId: "user-id",
  title: "Hello",
  contentJson: { type: "doc", content: [{ type: "paragraph" }] },
  isPublic: false,
  publicSlug: null as string | null,
  createdAt: "2026-05-01T12:00:00.000Z",
  updatedAt: "2026-05-01T12:00:00.000Z",
};

describe("TipTapDocSchema", () => {
  it("accepts a minimal { type: 'doc' }", () => {
    expect(TipTapDocSchema.parse({ type: "doc" })).toEqual({ type: "doc" });
  });

  it("accepts a populated doc with a content array", () => {
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "hi" }] },
      ],
    };
    expect(TipTapDocSchema.parse(doc)).toEqual(doc);
  });

  it("rejects a wrong root type", () => {
    expect(() => TipTapDocSchema.parse({ type: "paragraph" })).toThrow();
  });

  it("rejects when content is not an array", () => {
    expect(() =>
      TipTapDocSchema.parse({ type: "doc", content: "nope" }),
    ).toThrow();
  });

  it("passes unknown keys through (so future TipTap features don't break)", () => {
    const result = TipTapDocSchema.parse({
      type: "doc",
      attrs: { meta: 1 },
    }) as { type: "doc"; attrs?: unknown };
    expect(result.attrs).toEqual({ meta: 1 });
  });
});

describe("CreateNoteRequestSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(CreateNoteRequestSchema.parse({})).toEqual({});
  });

  it("accepts a title only", () => {
    expect(CreateNoteRequestSchema.parse({ title: "x" })).toEqual({
      title: "x",
    });
  });

  it("accepts a contentJson only", () => {
    const out = CreateNoteRequestSchema.parse({ contentJson: { type: "doc" } });
    expect(out.contentJson).toEqual({ type: "doc" });
  });
});

describe("UpdateNoteRequestSchema", () => {
  it("accepts a partial update with just title", () => {
    expect(UpdateNoteRequestSchema.parse({ title: "new" })).toEqual({
      title: "new",
    });
  });

  it("rejects malformed contentJson", () => {
    expect(() =>
      UpdateNoteRequestSchema.parse({ contentJson: { type: "paragraph" } }),
    ).toThrow();
  });

  it("rejects non-string title", () => {
    expect(() => UpdateNoteRequestSchema.parse({ title: 42 })).toThrow();
  });
});

describe("ShareRequestSchema", () => {
  it("requires isPublic", () => {
    expect(() => ShareRequestSchema.parse({})).toThrow();
  });

  it("accepts isPublic: true", () => {
    expect(ShareRequestSchema.parse({ isPublic: true })).toEqual({
      isPublic: true,
    });
  });

  it("rejects non-boolean isPublic", () => {
    expect(() => ShareRequestSchema.parse({ isPublic: "yes" })).toThrow();
  });
});

describe("ShareResponseSchema", () => {
  it("accepts the public-on response shape", () => {
    expect(
      ShareResponseSchema.parse({
        id: "x",
        isPublic: true,
        publicSlug: "abcdefghij",
      }),
    ).toEqual({ id: "x", isPublic: true, publicSlug: "abcdefghij" });
  });

  it("accepts a null publicSlug (public-off response)", () => {
    expect(
      ShareResponseSchema.parse({
        id: "x",
        isPublic: false,
        publicSlug: null,
      }),
    ).toEqual({ id: "x", isPublic: false, publicSlug: null });
  });
});

describe("NoteSchema", () => {
  it("accepts a full note with publicSlug = null", () => {
    expect(NoteSchema.parse(sampleNote)).toEqual(sampleNote);
  });

  it("accepts a public note with a slug", () => {
    const pub = { ...sampleNote, isPublic: true, publicSlug: "abc" };
    expect(NoteSchema.parse(pub)).toEqual(pub);
  });

  it("rejects when contentJson is missing", () => {
    const { contentJson: _drop, ...rest } = sampleNote;
    expect(() => NoteSchema.parse(rest)).toThrow();
  });
});

describe("PublicNoteSchema", () => {
  it("accepts a minimal public read response", () => {
    expect(
      PublicNoteSchema.parse({
        title: "Public",
        contentJson: { type: "doc" },
        updatedAt: "2026-05-01T12:00:00.000Z",
      }),
    ).toEqual({
      title: "Public",
      contentJson: { type: "doc" },
      updatedAt: "2026-05-01T12:00:00.000Z",
    });
  });

  it("strips unknown fields like userId / id (no leakage on public reads)", () => {
    const parsed = PublicNoteSchema.parse({
      title: "Public",
      contentJson: { type: "doc" },
      updatedAt: "2026-05-01T12:00:00.000Z",
      userId: "leaked",
      id: "leaked-id",
    } as Record<string, unknown>);
    expect("userId" in parsed).toBe(false);
    expect("id" in parsed).toBe(false);
  });
});
