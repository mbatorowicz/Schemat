# Edytor schematów CS-TB-48

Aplikacja do edycji schematów SVG i biblioteki symboli. Wymagania: [PRD.md](PRD.md).

## Uruchomienie lokalne

```bash
cd Schemat
npm install
npm run dev
```

Otwórz http://localhost:5173 — w **Otwórz projekt** wskaż folder konkretnego projektu, np. `schematy/project/CS-TB-48/`. Po zmianie plików SVG na dysku użyj **Otwórz projekt** ponownie lub **Przywróć dostęp** po F5. **Niezapisane zmiany nie są nadpisywane** przy odświeżeniu — edytor ostrzega przed zamknięciem karty. Zawsze kliknij **Zapisz** przed zamknięciem.

### Wymagania przeglądarki

| Przeglądarka | Otwarcie folderu projektu | Zapis na dysk |
|--------------|---------------------------|---------------|
| Chrome / Edge | Pełna obsługa (File System Access API) | Tak |
| Firefox / Safari | Tylko pojedynczy plik SVG | Pobieranie pliku |

## Build i testy

```bash
npm run build
npm run preview
npm test
npm run test:coverage
npm run lint
```

## Deploy na Vercel

1. Push repozytorium na GitHub ([github.com/mbatorowicz/Schemat](https://github.com/mbatorowicz/Schemat))
2. Wejdź na [vercel.com/new](https://vercel.com/new) → **Import** repozytorium `Schemat`
3. Framework Preset: **Vite** (auto-detect); Build Command: `npm run build`; Output Directory: `dist`
4. **Deploy** — otrzymasz URL produkcyjny; każdy PR dostaje preview URL
5. Po wejściu na stronę: **Otwórz projekt** → wskaż lokalny folder z dysku (dane projektu nie są na serwerze Vercel)

Konfiguracja: [`vercel.json`](vercel.json) (nagłówki CSP, static build).

## Struktura `src/`

| Plik | Rola |
|------|------|
| `main.js` | UI edytora, routing, rysowanie |
| `app-bootstrap.js` | Kolejność init sceny i modułów (`getRouteSelectedConnection`) |
| `netlist-ui.js` | UI spisu połączeń, ładowanie netlisty |
| `file-io.js` | Zapis/odczyt plików (File System Access API) |
| `element-factory.js` | Tworzenie elementów SVG (tekst, chrome, uchwyty) |
| `dom-selectors.js` | Bezpieczne selektory CSS (`CSS.escape`) |
| `stage-layers.js` | Warstwy sceny DOM (`createStageLayers`, gettery host/sel) |
| `render-pipeline.js` | `rebuildEditDefs`, `rebuildHost`, mapowanie src↔klon |
| `defs-assembler.js` | Składanie `<defs>` podglądu/zapisu, aliasy symboli |
| `netlist-routing.js` | Trasowanie netlisty, endpointy, propozycje |
| `selection-model.js` | Zaznaczenie, style rekordów, pasek kontekstowy |
| `project-migrate.js` | Migracje projektu (aliasy id, osadzone defs) |
| `symbol-service.js` | Kanonizacja href, audit symboli na arkuszu |
| `dom-pairing.js` | `childPair` — mapowanie element src ↔ klon |
| `element-styles.js` | `applyTextStyle` — typografia bez nadpisywania |
| `svg-dom.js` / `svg-constants.js` | Pomocnicze operacje DOM SVG |
| `symbol-resolver.js` | Rozwiązywanie `<use href="#…">` — **biblioteka jest źródłem prawdy** |
| `library-loader.js` | Wczytywanie E-00 z dysku (w tym `../../lib/` z projekt.json) |
| `sheet-persistence.js` | Flaga `dirty`, bezpieczny zapis `<defs>`, ochrona przed nadpisaniem z dysku |
| `persistence.js` | IndexedDB/localStorage — kopia zapasowa między sesjami |
| `conn-theme.js` | SSOT — kolory, promień punktów styku, CSS złączy |
| `conn-model.js` | Model złączy (point/lead, migracja, endpointy) |
| `conn-contact-pick.js` | Wybór styku punktu przy trasowaniu |
| `symbol-aliases.js` | Migracja starych id symboli (Przylacze→WD, Xx-3→X-3, sk1/SK1/NO→SK…) |
| `netlist-model.js` | Parser spisu połączeń (ESM) |
| `orthogonal-router.js` | Trasowanie ortogonalne przewodów |
| `wire-theme.js` | Kolory przewodów w netliście |
| `history.js` | Undo / redo |
| `svg-utils.js` | Operacje na SVG, sanityzacja przed parse |
| `instance-refs.js` | Numeracja i edycja `data-ref` |
| `sheet-elements.js` | Lista elementów arkusza |
| `project-files.js` | Otwieranie i zapis plików projektu |

Dane projektu (poza repozytorium): `../schematy/lib/`, `../schematy/project/CS-TB-48/` (arkusze: Zasilanie, Bezpieczenstwo, Enable, Naped, Zator + `polaczenia_*.md`).
