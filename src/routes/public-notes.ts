import { Router } from "express";
import { getNoteByPublicSlug } from "../repositories/notes";
import { TipTapDocSchema } from "../schemas/notes";

const router = Router();

router.get("/:slug", async (req, res) => {
  const note = await getNoteByPublicSlug(req.params.slug!);
  if (!note) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    title: note.title,
    contentJson: TipTapDocSchema.parse(note.contentJson),
    updatedAt: note.updatedAt.toISOString(),
  });
});

export default router;
