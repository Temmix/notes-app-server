import { nanoid } from "nanoid";
import type { Note, Prisma } from "@prisma/client";
import { db } from "../db/prisma";

const EMPTY_DOC: Prisma.InputJsonValue = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export type NoteListItem = {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  updatedAt: Date;
};

export async function createNote(
  userId: string,
  data: { title?: string; contentJson?: Prisma.InputJsonValue } = {},
): Promise<Note> {
  return db.note.create({
    data: {
      userId,
      title: data.title?.trim() || "Untitled note",
      contentJson: data.contentJson ?? EMPTY_DOC,
    },
  });
}

export async function getNoteById(
  userId: string,
  noteId: string,
): Promise<Note | null> {
  return db.note.findFirst({
    where: { id: noteId, userId },
  });
}

export async function getNotesByUser(
  userId: string,
): Promise<NoteListItem[]> {
  return db.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      isPublic: true,
      publicSlug: true,
      updatedAt: true,
    },
  });
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: Partial<{ title: string; contentJson: Prisma.InputJsonValue }>,
): Promise<Note | null> {
  const existing = await getNoteById(userId, noteId);
  if (!existing) return null;

  const update: Prisma.NoteUpdateInput = {};
  if (data.title !== undefined) {
    update.title = data.title.trim() || "Untitled note";
  }
  if (data.contentJson !== undefined) {
    update.contentJson = data.contentJson;
  }

  return db.note.update({ where: { id: noteId }, data: update });
}

export async function deleteNote(
  userId: string,
  noteId: string,
): Promise<boolean> {
  const result = await db.note.deleteMany({
    where: { id: noteId, userId },
  });
  return result.count > 0;
}

export async function setNotePublic(
  userId: string,
  noteId: string,
  isPublic: boolean,
): Promise<Note | null> {
  const existing = await getNoteById(userId, noteId);
  if (!existing) return null;

  if (isPublic) {
    return db.note.update({
      where: { id: noteId },
      data: {
        isPublic: true,
        publicSlug: existing.publicSlug ?? nanoid(16),
      },
    });
  }

  return db.note.update({
    where: { id: noteId },
    data: { isPublic: false, publicSlug: null },
  });
}

export async function getNoteByPublicSlug(
  slug: string,
): Promise<Note | null> {
  return db.note.findFirst({
    where: { publicSlug: slug, isPublic: true },
  });
}
