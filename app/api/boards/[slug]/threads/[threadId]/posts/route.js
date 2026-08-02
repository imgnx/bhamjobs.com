import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPost } from '../../../../../../../src/modules/discussions/data.js';

const schema = z.object({
  body: z.string().min(3).max(2500),
  author: z.string().max(60).optional(),
});

export async function POST(req, { params }) {
  try {
    const json = await req.json();
    const parsed = schema.parse({
      ...json,
      body: typeof json?.body === 'string' ? json.body.trim() : json?.body,
      author: typeof json?.author === 'string' ? json.author.trim() : json?.author,
    });

    await createPost({
      threadId: params.threadId,
      body: parsed.body,
      author: parsed.author,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_body', details: error.issues }, { status: 400 });
    }
    if (error?.message === 'thread_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('post_create_error', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
