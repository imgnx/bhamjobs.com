import Link from 'next/link';
import { notFound } from 'next/navigation';
import ThreadComposer from '../../../src/modules/discussions/components/ThreadComposer.jsx';
import { getBoardWithThreads } from '../../../src/modules/discussions/data.js';
import { formatDisplayDate, formatPreview } from '../../../src/modules/discussions/utils.js';

export async function generateMetadata({ params }) {
  const board = await getBoardWithThreads(params.slug);
  if (!board) return { title: 'Board — bhamjobs' };
  return {
    title: `${board.name} — bhamjobs`,
    description: board.description || 'Community board',
  };
}

export default async function BoardPage({ params }) {
  const board = await getBoardWithThreads(params.slug);
  if (!board) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4">
        <header className="rounded-xl bg-white/80 border border-border p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-fg">{board.name}</h1>
          {board.description && <p className="text-sm text-muted">{board.description}</p>}
        </header>
        <div className="space-y-4">
          {board.threads.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No threads yet. Start the first conversation below.
            </div>
          )}
          {board.threads.map((thread) => (
            <article key={thread.id} className="rounded-xl border border-border bg-white/80 p-4 shadow-sm transition hover:border-primary/40">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/boards/${board.slug}/${thread.id}`} className="text-base font-medium text-primary hover:underline">
                    {thread.title}
                  </Link>
                  <p className="text-xs text-muted">
                    Posted {formatDisplayDate(thread.createdAt)}
                    {thread.author ? ` • ${thread.author}` : ''}
                    {thread._count.posts > 0 ? ` • ${thread._count.posts} repl${thread._count.posts === 1 ? 'y' : 'ies'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {board.kind === 'FEATURE' && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {thread.voteCount} vote{thread.voteCount === 1 ? '' : 's'}
                    </span>
                  )}
                  {(board.kind === 'FEATURE' || thread.status !== 'OPEN') && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {thread.status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{formatPreview(thread.body)}</p>
              <div className="mt-4 text-xs">
                <Link href={`/boards/${board.slug}/${thread.id}`} className="text-primary/80 hover:text-primary">
                  View thread →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="space-y-4">
        <ThreadComposer boardSlug={board.slug} boardKind={board.kind} />
        <div className="rounded-xl border border-border bg-white/60 p-4 text-xs text-muted">
          Threads support Markdown-lite formatting (paragraphs & line breaks). Please avoid sharing personal data.
        </div>
      </aside>
    </div>
  );
}
