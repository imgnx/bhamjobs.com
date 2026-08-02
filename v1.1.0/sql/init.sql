-- Minimal app schema for security assertion and logging
create table if not exists app_log (
  id bigserial primary key,
  message text not null,
  created_at timestamptz not null default now()
);

-- Forum & feedback enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'board_kind') then
    create type board_kind as enum ('FORUM', 'BULLETIN', 'FEATURE');
  end if;
  if not exists (select 1 from pg_type where typname = 'thread_status') then
    create type thread_status as enum ('OPEN', 'UNDER_REVIEW', 'PLANNED', 'COMPLETED', 'ARCHIVED');
  end if;
end;
$$;

-- Boards (forum, bulletin, feature requests)
create table if not exists forum_board (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text,
  kind board_kind not null default 'FORUM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Threads within boards
create table if not exists discussion_thread (
  id text primary key,
  board_id text not null references forum_board(id) on delete cascade,
  title text not null,
  body text not null,
  author text,
  status thread_status not null default 'OPEN',
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discussion_thread_board_idx on discussion_thread(board_id);

-- Posts / replies
create table if not exists discussion_post (
  id text primary key,
  thread_id text not null references discussion_thread(id) on delete cascade,
  body text not null,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discussion_post_thread_idx on discussion_post(thread_id);
