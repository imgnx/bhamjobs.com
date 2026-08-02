"use server";

import { BoardKind, ThreadStatus } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "../../lib/prisma.js";
import { normalizeThreadStatus } from "./utils.js";

const DEFAULT_BOARDS = [
  {
    slug: "discussions",
    name: "Community Discussions",
    description: "General chat about Birmingham jobs, hiring, and local insights.",
    kind: BoardKind.FORUM,
  },
  {
    slug: "bulletin",
    name: "Bulletin Board",
    description: "Announcements, meetups, and quick notices.",
    kind: BoardKind.BULLETIN,
  },
  {
    slug: "feature-requests",
    name: "Feature Requests",
    description: "Suggest improvements and vote on what should ship next.",
    kind: BoardKind.FEATURE,
  },
];

async function ensureDefaultBoards() {
  await Promise.all(
    DEFAULT_BOARDS.map((board) =>
      prisma.forumBoard.upsert({
        where: { slug: board.slug },
        update: {
          name: board.name,
          description: board.description,
          kind: board.kind,
        },
        create: board,
      }),
    ),
  );
}

export async function getBoards() {
  noStore();
  await ensureDefaultBoards();
  return prisma.forumBoard.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { threads: true } },
    },
  });
}

export async function getBoardWithThreads(slug) {
  noStore();
  await ensureDefaultBoards();
  return prisma.forumBoard.findUnique({
    where: { slug },
    include: {
      threads: {
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          voteCount: true,
          author: true,
          createdAt: true,
          updatedAt: true,
          body: true,
          _count: { select: { posts: true } },
        },
      },
    },
  });
}

export async function getThreadWithPosts(threadId) {
  noStore();
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    include: {
      board: true,
      posts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          author: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });
  return thread;
}

export async function createThread({ boardSlug, title, body, author, status }) {
  await ensureDefaultBoards();
  const board = await prisma.forumBoard.findUnique({ where: { slug: boardSlug } });
  if (!board) throw new Error("board_not_found");

  const normalizedStatus = normalizeThreadStatus(status);
  const statusForThread =
    board.kind === BoardKind.FEATURE && normalizedStatus && ThreadStatus[normalizedStatus]
      ? ThreadStatus[normalizedStatus]
      : ThreadStatus.OPEN;

  const thread = await prisma.discussionThread.create({
    data: {
      boardId: board.id,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 3000),
      author: author?.trim() ? author.trim().slice(0, 60) : "Anonymous",
      status: statusForThread,
    },
  });

  return { thread, board };
}

export async function createPost({ threadId, body, author }) {
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    include: { board: true },
  });
  if (!thread) throw new Error("thread_not_found");

  const post = await prisma.discussionPost.create({
    data: {
      threadId: thread.id,
      body: body.trim().slice(0, 2500),
      author: author?.trim() ? author.trim().slice(0, 60) : "Anonymous",
    },
  });

  await prisma.discussionThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  return { post, thread };
}

export async function voteForThread({ threadId }) {
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    include: { board: true },
  });
  if (!thread) throw new Error("thread_not_found");
  if (thread.board.kind !== BoardKind.FEATURE) {
    throw new Error("voting_not_supported");
  }

  const updated = await prisma.discussionThread.update({
    where: { id: threadId },
    data: { voteCount: { increment: 1 } },
    select: { id: true, voteCount: true },
  });
  return updated;
}
