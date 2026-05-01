import { z } from "zod";

export const TipTapDocSchema = z.looseObject({
  type: z.literal("doc"),
  content: z.array(z.unknown()).optional(),
});

export const NoteListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  isPublic: z.boolean(),
  publicSlug: z.string().nullable(),
  updatedAt: z.string(),
});
export type NoteListItem = z.infer<typeof NoteListItemSchema>;

export const NoteSchema = NoteListItemSchema.extend({
  userId: z.string(),
  contentJson: TipTapDocSchema,
  createdAt: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteRequestSchema = z.object({
  title: z.string().optional(),
  contentJson: TipTapDocSchema.optional(),
});
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;

export const UpdateNoteRequestSchema = z.object({
  title: z.string().optional(),
  contentJson: TipTapDocSchema.optional(),
});
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;

export const ShareRequestSchema = z.object({ isPublic: z.boolean() });
export type ShareRequest = z.infer<typeof ShareRequestSchema>;

export const ShareResponseSchema = z.object({
  id: z.string(),
  isPublic: z.boolean(),
  publicSlug: z.string().nullable(),
});
export type ShareResponse = z.infer<typeof ShareResponseSchema>;

export const PublicNoteSchema = z.object({
  title: z.string(),
  contentJson: TipTapDocSchema,
  updatedAt: z.string(),
});
export type PublicNote = z.infer<typeof PublicNoteSchema>;
