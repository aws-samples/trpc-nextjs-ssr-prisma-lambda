import { z } from 'zod';

export const postCommentInputs = z.object({
  author: z.string().optional(),
  email: z.string().optional(),
  body: z.string().min(1),
});

export const listCommentInputs = z.object({
  // offset: z.number().optional(),
});
