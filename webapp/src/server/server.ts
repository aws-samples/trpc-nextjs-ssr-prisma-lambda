import { commentsRouter } from './routers/comments';
import { router } from './trpc';

// https://trpc.io/docs/server/merging-routers
export const appRouter = router({
  comments: commentsRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
