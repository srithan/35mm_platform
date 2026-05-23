import { z } from "zod";

export const cursorPaginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const createPostSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  filmId: z.string().min(1).optional()
});

export const sendMessageSchema = z.object({
  text: z.string().trim().max(5000),
  replyToId: z.string().min(1).optional()
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
