/**
 * Rdzeń pomocnika — strumień SSE. Wspólny dla Vercel i Vite middleware.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { lookupPublicGuidance } from "./lookup-public-guidance.js";
import { validateProposals } from "../src/assistant-proposals.js";

export const ASSISTANT_MODEL = "anthropic/claude-sonnet-5";

const BRIEF = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "standards-brief.md"), "utf8");

const proposalItem = z.object({
  type: z.enum(["insert_symbol", "add_connection", "update_connection", "route_connection", "set_label", "highlight"]),
  symbolId: z.string().optional(),
  ref: z.string().optional(),
  refs: z.array(z.string()).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  id: z.string().optional(),
  net: z.string().optional(),
  wire: z.string().optional(),
  length: z.string().optional(),
  notes: z.string().optional(),
  patch: z.record(z.string(), z.string()).optional(),
  role: z.enum(["desig", "desc", "desc2"]).optional(),
  text: z.string().optional(),
  summary: z.string().optional(),
});

function catalogIdsFromContext(context) {
  const list = context?.symbolCatalog;
  if (!Array.isArray(list)) return [];
  return list.map((s) => s?.id).filter(Boolean);
}

function instructionsFor(context) {
  const norm = context?.project?.norm || "EN 60204-1";
  return [
    "Jesteś pomocnikiem konstruktora elektrycznego w edytorze schematów SVG (konwencja E-00).",
    "Odpowiadasz po polsku, zwięźle, bez żargonu frameworków.",
    "Widzisz JSON kontekstu arkusza oraz opcjonalny zrzut PNG aktualnego widoku.",
    "Norma projektu: " + norm + ".",
    "Pilnuj zgodności ze spisem, biblioteką symboli, EN 60204-1, IEC/EN 60617 i EN 81346-2.",
    "Nie wymyślaj symboli spoza symbolCatalog. Nie twierdź, że zmieniłeś rysunek — zmiany idą tylko jako propozycje do akceptacji.",
    "Gdy powołujesz się na normę spoza briefu, wywołaj lookupPublicGuidance i cytuj URL. Gdy brak źródła, napisz że treść jest niepewna.",
    "Nie podawaj obliczeń prądów ani doboru przekroju.",
    "",
    BRIEF,
  ].join("\n");
}

function toModelMessages(messages, contextJson, imageDataUrl) {
  const list = Array.isArray(messages) ? messages : [];
  return list.map((m, i) => {
    const role = m?.role === "assistant" ? "assistant" : "user";
    const text = String(m?.content ?? m?.text ?? "");
    const lastUser = i === list.length - 1 && role === "user";
    if (!lastUser) return { role, content: text };
    const parts = [
      {
        type: "text",
        text: "Kontekst edytora (JSON):\n" + contextJson + "\n\nPytanie użytkownika:\n" + text,
      },
    ];
    if (imageDataUrl && /^data:image\//.test(imageDataUrl)) {
      parts.push({ type: "image", image: imageDataUrl });
    }
    return { role: "user", content: parts };
  });
}

function sseLine(obj) {
  return "data: " + JSON.stringify(obj) + "\n\n";
}

function partDelta(part) {
  if (!part || typeof part !== "object") return "";
  return String(part.text ?? part.delta ?? part.textDelta ?? "");
}

/**
 * @param {{ messages?: unknown[], context?: object, image?: string }} body
 * @param {{ onEvent: (ev: object) => void, signal?: AbortSignal }} hooks
 */
export async function runAssistantSession(body, hooks) {
  const onEvent = hooks.onEvent;
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length) {
    onEvent({ type: "error", message: "Brak wiadomości." });
    return;
  }
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  const contextJson = JSON.stringify(context);
  const catalogIds = catalogIdsFromContext(context);

  const result = streamText({
    model: ASSISTANT_MODEL,
    instructions: instructionsFor(context),
    messages: toModelMessages(messages, contextJson, body?.image),
    abortSignal: hooks.signal,
    stopWhen: stepCountIs(6),
    tools: {
      lookupPublicGuidance: tool({
        description:
          "Szuka publicznych wskazówek (Wikipedia, DuckDuckGo) o EN 60204-1, IEC 60617, EN 81346, symbolach. Zwraca URL do cytowania. Nie zastępuje oficjalnego tekstu normy.",
        inputSchema: z.object({
          query: z.string().describe("Zapytanie, np. IEC 60617 contactor symbol albo EN 81346 letter codes"),
        }),
        execute: async ({ query }) => lookupPublicGuidance(query, { signal: hooks.signal }),
      }),
      proposeEdits: tool({
        description:
          "Zgłasza propozycje edycji schematu do akceptacji użytkownika. Używaj gdy chcesz wstawić symbol, dodać/zmienić połączenie, wytyczyć trasę, zmienić etykietę lub podświetlić elementy.",
        inputSchema: z.object({
          proposals: z.array(proposalItem).describe("Lista propozycji edycji"),
        }),
        execute: async ({ proposals }) => {
          const { accepted, rejected } = validateProposals(proposals, { catalogIds });
          if (accepted.length) onEvent({ type: "proposals", items: accepted });
          return { accepted: accepted.length, rejected };
        },
      }),
    },
  });

  const stream = result.stream || result.fullStream;
  for await (const part of stream) {
    const t = part?.type;
    if (t === "text-delta") {
      const delta = partDelta(part);
      if (delta) onEvent({ type: "text", delta });
    } else if (t === "error") {
      onEvent({ type: "error", message: String(part.error?.message || part.error || "Błąd modelu") });
    }
  }
  onEvent({ type: "done" });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {object} body
 * @param {AbortSignal} [signal]
 */
export async function writeAssistantSse(res, body, signal) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  try {
    await runAssistantSession(body, {
      signal,
      onEvent: (ev) => {
        res.write(sseLine(ev));
      },
    });
  } catch (e) {
    res.write(sseLine({ type: "error", message: String(e?.message || e) }));
    res.write(sseLine({ type: "done" }));
  }
  res.end();
}

export { sseLine };
