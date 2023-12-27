import { publicProcedure, router } from '../../trpc';
import { prisma } from '../../common/prisma';
import { listCommentInputs, postCommentInputs } from '@/common/types/comments';

export const commentsRouter = router({
  post: publicProcedure.input(postCommentInputs).mutation(async (opts) => {
    const comment = await prisma.comments.create({
      data: {
        body: opts.input.body,
        author: opts.input.author ?? 'anonymous',
        email: opts.input.email,
      },
    });
    return comment;
  }),

  list: publicProcedure.input(listCommentInputs).query(async (opts) => {
    return await prisma.comments.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }),
});
