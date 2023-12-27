import { trpc } from '@/utils/trpc';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/server/server';
import { postCommentInputs } from '@/common/types/comments';
import { z } from 'zod';

// Note that we can reuse server side schema definition here
// https://trpc.io/docs/client/vanilla/infer-types
type PostComment = z.infer<typeof postCommentInputs>;
type RouterOutput = inferRouterOutputs<AppRouter>;
export type Comment = RouterOutput['comments']['post'];

export default function Post() {
  const utils = trpc.useUtils();
  const listQuery = trpc.comments.list.useQuery({});
  const postMutation = trpc.comments.post.useMutation({
    onSuccess(data, variables, context) {
      utils.comments.list.setData({}, (old) => [...(old ?? []), data]);
    },
  });

  const { register, handleSubmit, resetField } = useForm<PostComment>({
    resolver: zodResolver(postCommentInputs),
    defaultValues: {},
  });

  const onSubmit: SubmitHandler<PostComment> = async (input: PostComment) => {
    if (input.author == '') input.author = undefined;
    if (input.email == '') input.email = undefined;
    await postMutation.mutateAsync(input);
    resetField('body', {});
  };

  return (
    <div className="mt-5">
      <form className="max-w-xl flex-col" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-row items-center">
          <label htmlFor="author" className="inline-block align-middle text-sm font-medium text-gray-900 ml-2">
            Name:
          </label>

          <input
            className="bg-gray-50 border-gray-300 border ml-1 my-1 px-2 py-0.5 flex-auto"
            {...register('author')}
            type="text"
            id="author"
            placeholder="Name (optional)"
          />
          <label htmlFor="email" className="inline-block align-middle text-sm font-medium text-gray-900 ml-2">
            Email:
          </label>
          <input
            className="bg-gray-50 border-gray-300 border ml-1 my-1 px-2 py-0.5 flex-auto"
            {...register('email')}
            type="text"
            id="email"
            placeholder="Email (optional)"
          />
        </div>
        <div className="flex">
          <textarea
            {...register('body')}
            id="body"
            rows={4}
            className="block p-2.5 w-full text-gray-900 bg-gray-50 border border-gray-300 ml-1"
            placeholder="Write a comment..."
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-200 px-6 py-1 my-1 ml-1 text-center text-sm font-medium hover:bg-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Post
        </button>
      </form>
    </div>
  );
}
