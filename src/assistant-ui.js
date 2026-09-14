/**
 * Panel pomocnika AI — czat, skrót audytu, karty propozycji.
 */
import { W } from "./ui-wording.js";
import { streamAssistantChat } from "./assistant-client.js";
import { buildAssistantContext } from "./assistant-context.js";
import { captureStagePng } from "./assistant-capture.js";

function el(id) {
  return document.getElementById(id);
}

/**
 * @param {{
 *   getState: () => object,
 *   getSettingsCfg: () => object,
 *   connectionDiagnostics: (r: object) => { ok: boolean, reason?: string },
 *   getStage: () => Element|null,
 *   applyProposal: (p: object) => Promise<{ ok: boolean, error?: string, message?: string }>,
 *   setStatus: (msg: string, opts?: object) => void,
 * }} deps
 */
export function createAssistantPanel(deps) {
  const panel = el("assistantPanel");
  const messagesEl = el("assistantMessages");
  const form = el("assistantForm");
  const input = el("assistantInput");
  const sendBtn = el("btnAssistantSend");
  const reviewBtn = el("btnAssistantReview");
  const openBtn = el("btnAssistant");
  const closeBtn = el("btnAssistantClose");
  const history = [];
  let abort = null;
  let busy = false;

  function isOpen() {
    return document.getElementById("app")?.classList.contains("assistant-open");
  }

  function setOpen(open) {
    const app = document.getElementById("app");
    if (app) app.classList.toggle("assistant-open", open);
    if (panel) {
      panel.hidden = !open;
      panel.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (openBtn) openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && input) input.focus();
  }

  function setBusy(on) {
    busy = !!on;
    if (sendBtn) sendBtn.disabled = busy;
    if (reviewBtn) reviewBtn.disabled = busy;
    if (input) input.disabled = busy;
  }

  function addBubble(role, text) {
    if (!messagesEl) return null;
    const wrap = document.createElement("div");
    wrap.className = "assistant-msg assistant-msg--" + role;
    const body = document.createElement("div");
    body.className = "assistant-msg-body";
    body.textContent = text;
    wrap.appendChild(body);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return { wrap, body };
  }

  function addProposals(items) {
    if (!messagesEl || !items?.length) return;
    items.forEach((p) => {
      const card = document.createElement("div");
      card.className = "assistant-proposal";
      const title = document.createElement("div");
      title.className = "assistant-proposal-title";
      title.textContent = p.summary || p.type;
      const meta = document.createElement("div");
      meta.className = "assistant-proposal-meta";
      meta.textContent = p.type;
      const actions = document.createElement("div");
      actions.className = "assistant-proposal-actions";
      const apply = document.createElement("button");
      apply.type = "button";
      apply.className = "primary";
      apply.textContent = W.assistant.apply;
      const reject = document.createElement("button");
      reject.type = "button";
      reject.textContent = W.assistant.reject;
      apply.onclick = async () => {
        apply.disabled = true;
        reject.disabled = true;
        try {
          const r = await deps.applyProposal(p);
          if (!r.ok) {
            apply.disabled = false;
            reject.disabled = false;
            deps.setStatus(r.error || W.assistant.applyFailed, { toast: true, tone: "warning" });
            return;
          }
          card.classList.add("is-applied");
          deps.setStatus(r.message || W.assistant.applied, { toast: true, tone: "success" });
        } catch (e) {
          apply.disabled = false;
          reject.disabled = false;
          deps.setStatus(String(e?.message || e), { toast: true, tone: "danger" });
        }
      };
      reject.onclick = () => {
        card.classList.add("is-rejected");
        apply.disabled = true;
        reject.disabled = true;
      };
      actions.append(apply, reject);
      card.append(title, meta, actions);
      messagesEl.appendChild(card);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function send(text) {
    const q = String(text || "").trim();
    if (!q || busy) return;
    setOpen(true);
    history.push({ role: "user", content: q });
    addBubble("user", q);
    const asst = addBubble("assistant", "");
    setBusy(true);
    abort?.abort();
    abort = new AbortController();
    let acc = "";
    try {
      const context = buildAssistantContext({
        state: deps.getState(),
        settingsCfg: deps.getSettingsCfg(),
        connectionDiagnostics: deps.connectionDiagnostics,
      });
      let image = null;
      try {
        image = await captureStagePng(deps.getStage?.());
      } catch {
        image = null;
      }
      if (!image) context.visualCapture = false;
      await streamAssistantChat({
        messages: history.slice(),
        context,
        image,
        signal: abort.signal,
        onEvent: (ev) => {
          if (ev.type === "text" && ev.delta) {
            acc += ev.delta;
            if (asst) asst.body.textContent = acc;
            if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
          } else if (ev.type === "proposals") {
            addProposals(ev.items);
          } else if (ev.type === "error") {
            const msg = ev.message || W.assistant.error;
            if (asst && !acc) asst.body.textContent = msg;
            deps.setStatus(msg, { toast: true, tone: "danger" });
          }
        },
      });
      if (asst && !acc) asst.body.textContent = W.assistant.empty;
      if (acc) history.push({ role: "assistant", content: acc });
    } catch (e) {
      if (e?.name === "AbortError") return;
      const msg = String(e?.message || e);
      if (asst && !acc) asst.body.textContent = msg;
      deps.setStatus(msg, { toast: true, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  function init() {
    if (openBtn) {
      openBtn.title = W.assistant.buttonTip;
      openBtn.onclick = () => setOpen(!isOpen());
    }
    if (closeBtn) {
      closeBtn.title = W.assistant.close;
      closeBtn.onclick = () => setOpen(false);
    }
    const title = el("assistantTitle");
    if (title) title.textContent = W.assistant.title;
    const disc = el("assistantDisclaimer");
    if (disc) disc.textContent = W.assistant.disclaimer;
    if (input) input.placeholder = W.assistant.placeholder;
    if (sendBtn) {
      const t = sendBtn.querySelector(".btn-text");
      if (t) t.textContent = W.assistant.send;
    }
    if (reviewBtn) {
      const t = reviewBtn.querySelector(".btn-text");
      if (t) t.textContent = W.assistant.review;
    }
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = input?.value || "";
        if (input) input.value = "";
        send(q);
      });
    }
    if (reviewBtn) {
      reviewBtn.onclick = () => send(W.assistant.reviewPrompt);
    }
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape" || !isOpen()) return;
        if (document.querySelector(".modal-bg.open")) return;
        e.preventDefault();
        e.stopPropagation();
        if (busy) {
          abort?.abort();
          setBusy(false);
        }
        setOpen(false);
      },
      true
    );
  }

  return { init, open: () => setOpen(true), close: () => setOpen(false), isOpen, send };
}
