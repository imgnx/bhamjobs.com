import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '../../../../src/lib/prisma.js';

export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_openai_key' }, { status: 500 });
  }
  try {
    const json = await req.json().catch(() => ({}));
    const { messages } = json;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 10) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }
    const capped = messages.slice(-5).map(m => ({
      role: ['user','assistant','system'].includes(m.role) ? m.role : 'user',
      content: String(m.content || '').slice(0, 1000),
    }));
    const sys = {
      role: 'system',
      content: 'You are the Birmingham jobs assistant. Provide short, safe, general guidance. Avoid personal data and keep replies under 120 words.',
    };
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_PUBLIC_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 180,
      messages: [sys, ...capped],
    });
    const content = response.choices?.[0]?.message?.content ?? '';
    try {
      await prisma.appLog.create({ data: { message: 'openai_public_chat:success' } });
    } catch (logError) {
      console.warn('openai_public_log_error', logError);
    }
    return NextResponse.json({ content, tier: 'consumer' });
  } catch (e) {
    try {
      await prisma.appLog.create({ data: { message: 'openai_public_chat:error' } });
    } catch (logError) {
      console.warn('openai_public_log_error', logError);
    }
    console.error('openai_public_error', e?.response?.data || e?.message || e);
    return NextResponse.json({ error: 'openai_upstream_error' }, { status: 502 });
  }
}
