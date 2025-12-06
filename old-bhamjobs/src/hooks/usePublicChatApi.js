export function usePublicChatApi({ baseUrl = '' } = {}) {
  async function chat(messages) {
    const res = await fetch(`${baseUrl}/api/openai/public-chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`API error ${res.status}: ${msg}`);
    }
    return res.json();
  }
  return { chat };
}
