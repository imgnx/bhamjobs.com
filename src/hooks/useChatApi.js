export function useChatApi({ baseUrl = '', token } = {}) {
  async function chat(messages) {
    const res = await fetch(`${baseUrl}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
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
