import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createThread } from '../../../../../src/modules/discussions/data.js';

const schema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(3000),
  author: z.string().max(60).optional(),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'PLANNED', 'COMPLETED', 'ARCHIVED']).optional(),
});

export async function POST(req, { params }) {
  try {
    const json = await req.json();
    const parsed = schema.parse({
      ...json,
      title: typeof json?.title === 'string' ? json.title.trim() : json?.title,
      body: typeof json?.body === 'string' ? json.body.trim() : json?.body,
      author: typeof json?.author === 'string' ? json.author.trim() : json?.author,
      status: typeof json?.status === 'string' ? json.status.toUpperCase().replace(/[\s-]+/g, '_') : json?.status,
    });

    const { thread } = await createThread({
      boardSlug: params.slug,
      title: parsed.title,
      body: parsed.body,
      author: parsed.author,
      status: parsed.status,
    });

    return NextResponse.json({ id: thread.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_body', details: error.issues }, { status: 400 });
    }
    if (error?.message === 'board_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('thread_create_error', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

