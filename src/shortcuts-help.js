/** Overlay skrótów klawiszowych. */

export const SHORTCUT_ROWS = [
  ["Ctrl+Z / Ctrl+Y", "Cofnij / Ponów"],
  ["Ctrl+C / X / V", "Kopiuj / Wytnij / Wklej"],
  ["Ctrl+Shift+V", "Wklej w miejscu"],
  ["Ctrl+D", "Klonuj zaznaczenie"],
  ["Ctrl+A", "Zaznacz wszystko"],
  ["Delete", "Usuń zaznaczenie / punkt łamania"],
  ["Alt+klik uchwytu", "Usuń punkt łamania"],
  ["Podwójny klik na trasie", "Dodaj punkt łamania"],
  ["Łamanie (belka)", "Tryb: klik na trasę = punkt łamania"],
  ["Esc / klik pustego", "Odznacz zaznaczenie i podświetlenie ze spisu"],
  ["Ctrl+S", "Zapisz"],
  ["Shift+przeciąganie", "Przesuń widok (pan)"],
  ["Kółko myszy", "Zoom"],
  ["Esc", "Anuluj rysowanie / tryb łamania / dialog"],
  ["Enter", "Zakończ linię / zatwierdź dialog"],
  ["?", "Ten spis skrótów"],
];

export function renderShortcutsList(container) {
  if (!container) return;
  container.innerHTML = "";
  const dl = document.createElement("dl");
  dl.className = "shortcuts-dl";
  SHORTCUT_ROWS.forEach(([keys, desc]) => {
    const dt = document.createElement("dt");
    dt.textContent = keys;
    const dd = document.createElement("dd");
    dd.textContent = desc;
    dl.append(dt, dd);
  });
  container.appendChild(dl);
}

/**
 * @param {{ overlayId?: string, openBtnId?: string, closeBtnId?: string, listId?: string }} [opts]
 */
export function bindShortcutsHelp(opts = {}) {
  const overlayId = opts.overlayId || "shortcutsHelp";
  const openBtnId = opts.openBtnId || "btnShortcuts";
  const closeBtnId = opts.closeBtnId || "shortcutsHelpClose";
  const listId = opts.listId || "shortcutsHelpList";

  const bg = document.getElementById(overlayId);
  const list = document.getElementById(listId);
  const openBtn = document.getElementById(openBtnId);
  const closeBtn = document.getElementById(closeBtnId);

  function open() {
    renderShortcutsList(list);
    if (bg) bg.classList.add("open");
    if (closeBtn) closeBtn.focus();
  }
  function close() {
    if (bg) bg.classList.remove("open");
  }

  if (openBtn) openBtn.onclick = open;
  if (closeBtn) closeBtn.onclick = close;
  if (bg) {
    bg.addEventListener("pointerdown", (e) => {
      if (e.target === bg) close();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (bg?.classList.contains("open")) close();
      else open();
    }
    if (e.key === "Escape" && bg?.classList.contains("open")) {
      e.preventDefault();
      close();
    }
  });

  return { open, close };
}
