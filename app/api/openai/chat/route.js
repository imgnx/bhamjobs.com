import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .min(1)
    .max(50),
});

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function POST(req) {
  // Simple bearer token check
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== process.env.API_TOKEN) return unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'missing_openai_key' }, { status: 500 });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: parsed.data.messages,
      temperature: 0.7,
    });
    const content = response.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ content });
  } catch (e) {
    console.error('openai_error', e?.response?.data || e?.message || e);
    return NextResponse.json({ error: 'openai_upstream_error' }, { status: 502 });
  }
}

