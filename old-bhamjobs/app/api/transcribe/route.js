import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const MAX_UPLOAD_BYTES = parseInt(process.env.ASR_MAX_UPLOAD_BYTES || '', 10) || 8 * 1024 * 1024; // 8MB
const MAX_TEXT_LEN = parseInt(process.env.ASR_MAX_TEXT_LEN || '', 10) || 1200;

export async function POST(req) {
  try {
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength && contentLength > MAX_UPLOAD_BYTES * 1.5) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'missing_file' }, { status: 400 });
    }
    const name = file.name || 'audio.webm';
    const size = file.size || 0;
    if (size <= 0 || size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
    }

    const tmpPath = path.join(os.tmpdir(), `asr-${randomUUID()}-${name}`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tmpPath, buf);

    const python = process.env.ASR_PYTHON || 'python3';
    const script = path.join(process.cwd(), 'scripts', 'transcribe.py');
    const model = process.env.ASR_MODEL || 'base';
    const language = process.env.ASR_LANGUAGE || 'auto';
    const computeType = process.env.ASR_COMPUTE_TYPE || 'int8';

    const args = [script, '--input', tmpPath, '--model', model, '--language', language, '--compute_type', computeType];

    const result = await new Promise((resolve) => {
      const child = spawn(python, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
      }, (parseInt(process.env.ASR_TIMEOUT_MS || '', 10) || 120000));
      child.stdout.on('data', (d) => { out += d.toString('utf8'); });
      child.stderr.on('data', (d) => { err += d.toString('utf8'); });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, out, err });
      });
    });

    try { await fs.unlink(tmpPath); } catch {}

    if (result.code !== 0) {
      // Try to parse error JSON
      let payload;
      try { payload = JSON.parse(result.out || '{}'); } catch {}
      return NextResponse.json({ error: 'asr_failed', detail: payload || result.err || 'unknown' }, { status: 502 });
    }

    let data;
    try { data = JSON.parse(result.out || '{}'); } catch {
      return NextResponse.json({ error: 'bad_asr_output' }, { status: 502 });
    }
    let text = String(data.text || '').trim();
    if (!text) return NextResponse.json({ error: 'no_text' }, { status: 422 });
    if (text.length > MAX_TEXT_LEN) text = text.slice(0, MAX_TEXT_LEN);

    return NextResponse.json({ text });
  } catch (e) {
    console.error('transcribe_error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

