import { NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function GET(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== process.env.API_TOKEN) return unauthorized();
  return NextResponse.json({ ok: true, role: 'admin' });
}

