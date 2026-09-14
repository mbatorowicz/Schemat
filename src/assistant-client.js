/**
 * Klient HTTP pomocnika AI (SSE).
 */

export function parseSseChunk(buffer) {
  const events = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf("\n\n")) >= 0) {
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    const line = block.split(/\r?\n/).find((l) => l.startsWith("data:"));
    if (!line) continue;
    const raw = line.replace(/^data:\s?/, "");
    if (!raw || raw === "[DONE]") continue;
    try {
      events.push(JSON.parse(raw));
    } catch {
      /* pomiń uszkodzony fragment */
    }
  }
  return { events, rest };
}

/**
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   context: object,
 *   image?: string|null,
 *   signal?: AbortSignal,
 *   onEvent: (ev: object) => void,
 * }} opts
 */
export async function streamAssistantChat(opts) {
  const { messages, context, image, signal, onEvent } = opts;
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context, image: image || undefined }),
    signal,
  });
  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = "Błąd pomocnika (" + res.status + ").";
    if (ctype.includes("application/json")) {
      const j = await res.json().catch(() => null);
      if (j?.error) msg = String(j.error);
    } else {
      const t = await res.text().catch(() => "");
      if (t) msg = t.slice(0, 400);
    }
    throw new Error(msg);
  }
  if (!res.body) throw new Error("Brak strumienia odpowiedzi.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buf);
    buf = parsed.rest;
    parsed.events.forEach((ev) => onEvent(ev));
  }
  if (buf.trim()) {
    const parsed = parseSseChunk(buf + "\n\n");
    parsed.events.forEach((ev) => onEvent(ev));
  }
}
