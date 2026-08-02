import Link from 'next/link';
import { getBoards } from '../../src/modules/discussions/data.js';

export const metadata = {
  title: 'Boards — bhamjobs',
  description: 'Community discussions, bulletin posts, and feature requests.',
};

export default async function BoardsPage() {
  const boards = await getBoards();

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white/80 border border-border p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-fg">Community Boards</h1>
        <p className="text-sm text-muted">
          Join the discussion, share announcements, and request new features for the Birmingham jobs assistant.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/boards/${board.slug}`}
            className="group rounded-xl border border-border bg-white/70 p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-fg">{board.name}</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {board._count.threads} topics
              </span>
            </div>
            {board.description && <p className="mt-2 text-sm text-muted">{board.description}</p>}
            <p className="mt-3 text-xs uppercase text-muted tracking-wide">View threads →</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

