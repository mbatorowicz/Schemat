/** SSOT etykiet i banera trybu rysowania (wydzielone z main.js). */

export const DRAW_LABELS = {
  line: "Linia",
  rect: "Prostokąt",
  circle: "Koło",
  arc: "Łuk",
  text: "Tekst",
  pin: "Pin",
  point: "Punkt",
  node: "Węzeł",
  lead: "Kreska",
  branch: "Odgałęź",
};

export const DRAW_HINT = {
  line: "Linia/łamana: klikaj punkty · Enter/dbl-klik = zakończ · Esc = anuluj.",
  rect: "Prostokąt: klik = 1. narożnik, klik = 2. narożnik · Esc = anuluj.",
  circle: "Okrąg: klik = środek, klik = promień · Esc = anuluj.",
  arc: "Łuk: klik = początek, klik = szczyt, klik = koniec · Esc = anuluj.",
  text: "Tekst: kliknij miejsce · Esc = anuluj.",
  pin: "Pin: kliknij miejsce · Esc = anuluj.",
  point: "Punkt: kliknij miejsce · Esc = anuluj.",
  node: "Węzeł: kliknij miejsce · Esc = anuluj.",
  lead: "Kreska: klik = początek, klik = koniec · Esc = anuluj.",
  branch: "Odgałęź: klik szynę (wspólny odcinek), potem cel · Esc = anuluj.",
};

/**
 * @param {{ drawBannerEl: HTMLElement|null, toolbarEl: HTMLElement|null, getDrawMode: () => string|null, onToolbarSync?: () => void }} deps
 */
export function createDrawBannerSync(deps) {
  const { drawBannerEl, toolbarEl, getDrawMode, onToolbarSync } = deps;
  return function syncDrawBanner() {
    if (!drawBannerEl) return;
    const mode = getDrawMode();
    if (mode) {
      drawBannerEl.textContent =
        "Rysujesz: " + (DRAW_LABELS[mode] || mode) + " — Esc anuluje" + (mode === "line" ? ", Enter kończy" : "");
      drawBannerEl.classList.add("open");
      if (toolbarEl) toolbarEl.classList.add("draw-mode");
    } else {
      drawBannerEl.classList.remove("open");
      drawBannerEl.textContent = "";
      if (toolbarEl) toolbarEl.classList.remove("draw-mode");
    }
    if (typeof onToolbarSync === "function") onToolbarSync();
  };
}
