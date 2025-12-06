import { NextResponse } from 'next/server';
import { voteForThread } from '../../../../../../src/modules/discussions/data.js';

export async function POST(req, { params }) {
  try {
    const thread = await voteForThread({ threadId: params.threadId });
    return NextResponse.json({ votes: thread.voteCount });
  } catch (error) {
    if (error?.message === 'thread_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (error?.message === 'voting_not_supported') {
      return NextResponse.json({ error: 'not_supported' }, { status: 400 });
    }
    console.error('thread_vote_error', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

