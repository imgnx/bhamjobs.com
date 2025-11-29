#!/usr/bin/env python3
"""
Lightweight CLI wrapper around faster-whisper to transcribe an audio file.

Usage:
  python3 scripts/transcribe.py --input /path/to/audio.webm --model base --language auto

Outputs a compact JSON object to stdout:
  { "text": "...", "duration": 1.23 }

Notes:
  - Requires `faster-whisper` to be installed in the active Python env.
    Install: pip install --upgrade faster-whisper
  - Model can be a size (tiny, base, small, medium, large-v2) or a local path.
  - Designed for CPU by default; GPU acceleration depends on your environment.
"""

import argparse
import json
import os
import sys


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument('--input', required=True, help='Path to audio file')
  parser.add_argument('--model', default=os.environ.get('ASR_MODEL', 'base'), help='Model size or path')
  parser.add_argument('--language', default='auto', help='Language code or "auto"')
  parser.add_argument('--beam_size', type=int, default=5)
  parser.add_argument('--compute_type', default=os.environ.get('ASR_COMPUTE_TYPE', 'int8'))
  args = parser.parse_args()

  try:
    from faster_whisper import WhisperModel
  except Exception as e:
    err = {
      'error': 'import_error',
      'message': 'faster-whisper is not installed. Run: pip install faster-whisper',
      'detail': str(e),
    }
    print(json.dumps(err))
    return 1

  if not os.path.exists(args.input):
    print(json.dumps({'error': 'missing_file'}))
    return 2

  # Initialize model
  try:
    # device/compute_type are best-effort; fall back gracefully
    model = WhisperModel(args.model, device=os.environ.get('ASR_DEVICE', 'cpu'), compute_type=args.compute_type)
  except Exception as e:
    print(json.dumps({'error': 'model_load_failed', 'message': str(e)}))
    return 3

  try:
    segments, info = model.transcribe(
      args.input,
      beam_size=args.beam_size,
      language=None if args.language == 'auto' else args.language,
      vad_filter=True,
    )
    text_parts = []
    for seg in segments:
      # Keep it compact; join with space
      txt = seg.text.strip()
      if txt:
        text_parts.append(txt)
    full_text = ' '.join(text_parts).strip()
    # Cap length to keep outputs short in public routes
    full_text = full_text[:2000]
    out = {
      'text': full_text,
      'duration': getattr(info, 'duration', None),
    }
    print(json.dumps(out, ensure_ascii=False))
    return 0
  except Exception as e:
    print(json.dumps({'error': 'transcribe_failed', 'message': str(e)}))
    return 4


if __name__ == '__main__':
  sys.exit(main())

