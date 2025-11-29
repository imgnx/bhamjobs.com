import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostComposer from '../../../../src/modules/discussions/components/PostComposer.jsx';
import VoteButton from '../../../../src/modules/discussions/components/VoteButton.jsx';
import { getThreadWithPosts } from '../../../../src/modules/discussions/data.js';
import { formatDisplayDate } from '../../../../src/modules/discussions/utils.js';

export async function generateMetadata({ params }) {
  const thread = await getThreadWithPosts(params.threadId);
  if (!thread || thread.board.slug !== params.slug) {
    return { title: 'Thread — bhamjobs' };
  }
  return {
    title: `${thread.title} — ${thread.board.name}`,
    description: thread.body.slice(0, 140),
  };
}

export default async function ThreadPage({ params }) {
  const thread = await getThreadWithPosts(params.threadId);
  if (!thread || thread.board.slug !== params.slug) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/boards" className="text-primary/80 hover:text-primary">
          Boards
        </Link>{' '}
        /{' '}
        <Link href={`/boards/${thread.board.slug}`} className="text-primary/80 hover:text-primary">
          {thread.board.name}
        </Link>{' '}
        / <span className="text-fg">{thread.title}</span>
      </nav>

      <article className="rounded-xl border border-border bg-white/80 p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-fg">{thread.title}</h1>
            <p className="text-xs text-muted">
              Posted {formatDisplayDate(thread.createdAt)}
              {thread.author ? ` • ${thread.author}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(thread.board.kind === 'FEATURE' || thread.status !== 'OPEN') && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {thread.status.replace(/_/g, ' ')}
              </span>
            )}
            {thread.board.kind === 'FEATURE' && (
              <VoteButton
                boardSlug={thread.board.slug}
                threadId={thread.id}
                initialVotes={thread.voteCount}
              />
            )}
          </div>
        </header>
        <div className="mt-4 whitespace-pre-wrap text-sm text-fg/90">{thread.body}</div>
      </article>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
          Replies ({thread.posts.length})
        </h2>
        {thread.posts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            No replies yet. Be the first to respond.
          </div>
        )}
        {thread.posts.map((post) => (
          <article key={post.id} className="rounded-xl border border-border bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{post.author || 'Anonymous'}</span>
              <time dateTime={post.createdAt}>{formatDisplayDate(post.createdAt)}</time>
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-fg/90">{post.body}</div>
          </article>
        ))}
      </section>

      <section>
        <PostComposer boardSlug={thread.board.slug} threadId={thread.id} />
      </section>
    </div>
  );
}
