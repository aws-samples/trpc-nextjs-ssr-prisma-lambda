import Head from 'next/head';
import { trpc } from '@/utils/trpc';
import Post from '@/components/post';

export default function Home() {
  const listQuery = trpc.comments.list.useQuery({});

  return (
    <div>
      <Head>
        <title>Ultra simple BBS</title>
      </Head>
      <div className="mx-8 my-2 p-4 rounded border border-black bg-gray-100">
        <div className="flex flex-col">
          {listQuery.data?.map((comment) => (
            <div key={comment.id} className="flex flex-col my-1 text-wrap">
              <div className="flex flex-row font-medium">
                <div className="mr-2">{comment.id.toString()}</div>
                <div className="mr-2">name:</div>
                {comment.email == null || comment.email == '' ? (
                  <div className="mr-2 text-teal-600">{comment.author}</div>
                ) : (
                  <a href={`mailto:${comment.email}`} className="mr-2 underline text-blue-600 hover:text-blue-800 visited:text-purple-600">
                    {comment.author}
                  </a>
                )}
                <div suppressHydrationWarning>{comment.createdAt.toLocaleString()}</div>
              </div>
              <div className="font-light whitespace-pre-line">{comment.body}</div>
            </div>
          ))}
        </div>
        <Post />
      </div>
    </div>
  );
}
