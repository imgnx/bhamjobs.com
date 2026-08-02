export function useTranscribe({ baseUrl = '' } = {}) {
  async function transcribeBlob(blob) {
    const fd = new FormData();
    fd.append('file', blob, 'audio.webm');
    const res = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST', body: fd });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Transcribe error ${res.status}: ${msg}`);
    }
    const json = await res.json();
    return json?.text || '';
  }
  return { transcribeBlob };
}

