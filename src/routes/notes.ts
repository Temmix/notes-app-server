import { Router } from "express";
import { ZodError } from "zod";
import type { Note as PrismaNote, Prisma } from "@prisma/client";
import {
  createNote,
  deleteNote,
  getNoteById,
  getNotesByUser,
  updateNote,
} from "../repositories/notes";
import {
  CreateNoteRequestSchema,
  TipTapDocSchema,
  UpdateNoteRequestSchema,
} from "../schemas/notes";
import { requireAuth } from "../auth/middleware";

const router = Router();

router.use(requireAuth);

function toApiNote(note: PrismaNote) {
  return {
    id: note.id,
    userId: note.userId,
    title: note.title,
    contentJson: TipTapDocSchema.parse(note.contentJson),
    isPublic: note.isPublic,
    publicSlug: note.publicSlug,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const notes = await getNotesByUser(req.user!.id);
  res.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      isPublic: n.isPublic,
      publicSlug: n.publicSlug,
      updatedAt: n.updatedAt.toISOString(),
    })),
  );
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateNoteRequestSchema.parse(req.body);
    const note = await createNote(req.user!.id, {
      title: parsed.title,
      contentJson: parsed.contentJson as Prisma.InputJsonValue | undefined,
    });
    res.status(201).json(toApiNote(note));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Invalid input", issues: err.issues });
      return;
    }
    throw err;
  }
});

router.get("/:id", async (req, res) => {
  const note = await getNoteById(req.user!.id, req.params.id!);
  if (!note) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toApiNote(note));
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = UpdateNoteRequestSchema.parse(req.body);
    const updated = await updateNote(req.user!.id, req.params.id!, {
      title: parsed.title,
      contentJson: parsed.contentJson as Prisma.InputJsonValue | undefined,
    });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(toApiNote(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Invalid input", issues: err.issues });
      return;
    }
    throw err;
  }
});

router.delete("/:id", async (req, res) => {
  const ok = await deleteNote(req.user!.id, req.params.id!);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});

export default router;
