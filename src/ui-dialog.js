/**
 * Modale potwierdzenia, toasty i wspólna a11y dialogów.
 */

/**
 * @param {{ id?: string, titleId?: string }} [opts]
 */
export function createConfirmDialog(opts = {}) {
  const bgId = opts.id || "confirmDialog";
  const titleId = opts.titleId || "confirmDialogTitle";
  let resolveFn = null;

  function el() {
    return document.getElementById(bgId);
  }

  function close(result) {
    const bg = el();
    if (bg) bg.classList.remove("open");
    if (resolveFn) {
      const r = resolveFn;
      resolveFn = null;
      r(!!result);
    }
  }

  /**
   * @param {string} message
   * @param {{ title?: string, okLabel?: string, cancelLabel?: string, danger?: boolean }} [cfg]
   * @returns {Promise<boolean>}
   */
  function ask(message, cfg = {}) {
    const bg = el();
    if (!bg) return Promise.resolve(window.confirm(message));
    const title = document.getElementById(titleId);
    const body = document.getElementById("confirmDialogBody");
    const ok = document.getElementById("confirmDialogOk");
    const cancel = document.getElementById("confirmDialogCancel");
    if (title) title.textContent = cfg.title || "Potwierdzenie";
    if (body) body.textContent = message;
    if (ok) {
      ok.textContent = cfg.okLabel || "Kontynuuj";
      ok.classList.toggle("danger-btn", !!cfg.danger);
    }
    if (cancel) cancel.textContent = cfg.cancelLabel || "Anuluj";
    bg.classList.add("open");
    if (ok) ok.focus();
    return new Promise((resolve) => {
      resolveFn = resolve;
    });
  }

  function init() {
    const bg = el();
    const ok = document.getElementById("confirmDialogOk");
    const cancel = document.getElementById("confirmDialogCancel");
    if (ok) ok.onclick = () => close(true);
    if (cancel) cancel.onclick = () => close(false);
    if (bg) {
      bg.addEventListener("pointerdown", (e) => {
        if (e.target === bg) close(false);
      });
    }
    document.addEventListener("keydown", (e) => {
      if (!el()?.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
      if (e.key === "Enter" && document.activeElement?.id === "confirmDialogOk") {
        e.preventDefault();
        close(true);
      }
    });
  }

  return { ask, close, init };
}

/**
 * Dialog 3-wyborowy: anuluj / lokalnie / biblioteka.
 * @param {{ id?: string, titleId?: string }} [opts]
 */
export function createChoiceDialog(opts = {}) {
  const bgId = opts.id || "choiceDialog";
  const titleId = opts.titleId || "choiceDialogTitle";
  let resolveFn = null;

  function el() {
    return document.getElementById(bgId);
  }

  /** @param {"cancel"|"local"|"library"} result */
  function close(result) {
    const bg = el();
    if (bg) bg.classList.remove("open");
    if (resolveFn) {
      const r = resolveFn;
      resolveFn = null;
      r(result);
    }
  }

  /**
   * @param {string} message
   * @param {{
   *   title?: string,
   *   cancelLabel?: string,
   *   localLabel?: string,
   *   libraryLabel?: string,
   * }} [cfg]
   * @returns {Promise<"cancel"|"local"|"library">}
   */
  function ask(message, cfg = {}) {
    const bg = el();
    if (!bg) {
      const ok = window.confirm(message);
      return Promise.resolve(ok ? "library" : "cancel");
    }
    const title = document.getElementById(titleId);
    const body = document.getElementById("choiceDialogBody");
    const cancel = document.getElementById("choiceDialogCancel");
    const local = document.getElementById("choiceDialogLocal");
    const lib = document.getElementById("choiceDialogLib");
    if (title) title.textContent = cfg.title || "Zakres zmiany";
    if (body) body.textContent = message;
    if (cancel) cancel.textContent = cfg.cancelLabel || "Anuluj";
    if (local) local.textContent = cfg.localLabel || "Tylko ten schemat";
    if (lib) lib.textContent = cfg.libraryLabel || "Zaktualizuj bibliotekę";
    bg.classList.add("open");
    if (lib) lib.focus();
    return new Promise((resolve) => {
      resolveFn = resolve;
    });
  }

  function init() {
    const bg = el();
    const cancel = document.getElementById("choiceDialogCancel");
    const local = document.getElementById("choiceDialogLocal");
    const lib = document.getElementById("choiceDialogLib");
    if (cancel) cancel.onclick = () => close("cancel");
    if (local) local.onclick = () => close("local");
    if (lib) lib.onclick = () => close("library");
    if (bg) {
      bg.addEventListener("pointerdown", (e) => {
        if (e.target === bg) close("cancel");
      });
    }
    document.addEventListener("keydown", (e) => {
      if (!el()?.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close("cancel");
      }
    });
  }

  return { ask, close, init };
}

/**
 * @param {{ hostId?: string, ttlMs?: number }} [opts]
 */
export function createToastHost(opts = {}) {
  const hostId = opts.hostId || "toastHost";
  const ttlMs = opts.ttlMs ?? 4200;

  function host() {
    return document.getElementById(hostId);
  }

  /**
   * @param {string} message
   * @param {"info"|"success"|"warning"|"danger"} [tone]
   */
  function show(message, tone = "info") {
    const h = host();
    if (!h || !message) return;
    const t = document.createElement("div");
    t.className = "toast toast--" + tone;
    t.setAttribute("role", "status");
    t.textContent = String(message);
    h.appendChild(t);
    requestAnimationFrame(() => t.classList.add("toast--show"));
    window.setTimeout(() => {
      t.classList.remove("toast--show");
      window.setTimeout(() => t.remove(), 220);
    }, ttlMs);
  }

  return { show };
}

/**
 * Esc / backdrop / focus pierwszego pola dla dialogów .modal-bg.
 * @param {{ id: string, labelledBy?: string, initialFocus?: string, onClose?: () => void }} cfg
 */
export function bindModalA11y(cfg) {
  const bg = document.getElementById(cfg.id);
  if (!bg) return { open() {}, close() {} };

  if (!bg.getAttribute("role")) bg.setAttribute("role", "dialog");
  bg.setAttribute("aria-modal", "true");
  if (cfg.labelledBy) bg.setAttribute("aria-labelledby", cfg.labelledBy);

  let prevFocus = null;

  function focusable() {
    return [
      ...bg.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((n) => n.offsetParent !== null || n === document.activeElement);
  }

  function open() {
    prevFocus = document.activeElement;
    bg.classList.add("open");
    const focusEl = (cfg.initialFocus && document.getElementById(cfg.initialFocus)) || focusable()[0];
    if (focusEl) focusEl.focus();
  }

  function close() {
    bg.classList.remove("open");
    if (typeof cfg.onClose === "function") cfg.onClose();
    if (prevFocus && typeof prevFocus.focus === "function") {
      try {
        prevFocus.focus();
      } catch (_) {
        /* ignore */
      }
    }
    prevFocus = null;
  }

  bg.addEventListener("pointerdown", (e) => {
    if (e.target === bg) close();
  });

  bg.addEventListener("keydown", (e) => {
    if (!bg.classList.contains("open")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const list = focusable();
    if (list.length < 2) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return { open, close, isOpen: () => bg.classList.contains("open") };
}

/**
 * Wrapper nad choice dialog dla trasowania (unika mylenia z schemat/biblioteka).
 * @returns {Promise<"cancel"|"local"|"library">}
 */
export function askRouteChoice(askChoiceFn, message, cfg = {}) {
  if (typeof askChoiceFn !== "function") return Promise.resolve("cancel");
  return askChoiceFn(message, {
    title: cfg.title || "Trasowanie",
    cancelLabel: cfg.cancelLabel || "Anuluj",
    localLabel: cfg.localLabel || "Zastąp",
    libraryLabel: cfg.libraryLabel || "Zachowaj",
  });
}

/**
 * Modal tekstowy (zamiast window.prompt).
 * HTML: #askTextDialog, #askTextDialogTitle, #askTextDialogLabel, #askTextDialogInput, #askTextDialogOk, #askTextDialogCancel
 */
export function createAskTextDialog(opts = {}) {
  const bgId = opts.id || "askTextDialog";
  let resolveFn = null;
  let a11y = null;

  /**
   * @param {string} title
   * @param {{ defaultValue?: string, label?: string }} [cfg]
   * @returns {Promise<string|null>}
   */
  function ask(title, cfg = {}) {
    const bg = document.getElementById(bgId);
    const titleEl = document.getElementById("askTextDialogTitle");
    const labelEl = document.getElementById("askTextDialogLabel");
    const input = document.getElementById("askTextDialogInput");
    if (!bg || !input) {
      const v = typeof window !== "undefined" ? window.prompt(title, cfg.defaultValue || "") : null;
      return Promise.resolve(v);
    }
    if (titleEl) titleEl.textContent = title || "Wartość";
    if (labelEl) labelEl.textContent = cfg.label || title || "Wartość";
    input.value = cfg.defaultValue != null ? String(cfg.defaultValue) : "";
    if (a11y) a11y.open();
    else bg.classList.add("open");
    return new Promise((resolve) => {
      resolveFn = resolve;
    });
  }

  function finish(ok) {
    const input = document.getElementById("askTextDialogInput");
    const val = ok && input ? input.value : null;
    const r = resolveFn;
    resolveFn = null;
    if (a11y) a11y.close();
    else {
      const bg = document.getElementById(bgId);
      if (bg) bg.classList.remove("open");
    }
    if (r) r(val);
  }

  function init() {
    a11y = bindModalA11y({
      id: bgId,
      labelledBy: opts.titleId || "askTextDialogTitle",
      initialFocus: "askTextDialogInput",
      onClose: () => {
        if (resolveFn) {
          const r = resolveFn;
          resolveFn = null;
          r(null);
        }
      },
    });
    document.getElementById("askTextDialogOk")?.addEventListener("click", () => finish(true));
    document.getElementById("askTextDialogCancel")?.addEventListener("click", () => finish(false));
    document.getElementById("askTextDialogInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      }
    });
  }

  return { ask, init, close: () => finish(false) };
}
