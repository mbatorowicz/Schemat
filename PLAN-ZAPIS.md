# Plan po audycie

Każdy krok jest zamknięty: cel, pliki, zmiana, test, kryterium „done”.
Wykonuj **jeden krok na jedno okno kontekstu**. Nie łącz kroków.
Na starcie kroku przeczytaj **tylko ten krok** + wymienione źródła.

Stan: `src/` · Vite · Vitest. Po kroku: `npm test` + `npm run lint`.
Nie rób force push, nie zmieniaj git config.
Po kroku: commit (`fix:` / `refactor:` / `docs:`) i zwykły `git push`.

Źródło ustaleń: audyt 13.09.2026 (`C1`…`L6`). ID w nawiasie = finding z audytu.

---

## Rejestr: finding → krok

| ID  | Waga      | Temat                                   | Krok                                  |
| --- | --------- | --------------------------------------- | ------------------------------------- |
| C1  | krytyczne | `#setSave` kasuje `sheetConnections`    | 1                                     |
| H1  | wysokie   | XSS `innerHTML` w tabeli spisu          | 8                                     |
| H2  | wysokie   | sanitize SVG tylko regex                | 9                                     |
| H3  | wysokie   | `main.js` god-object / martwy UI / SSOT | 13, 14, 15                            |
| M1  | średnie   | cache SVG + uchwyty FS w IDB            | 7, 12                                 |
| M2  | średnie   | CSP tylko Vercel, dziurawy              | 10                                    |
| M3  | średnie   | `library` przez `../` poza projekt      | 11                                    |
| M4  | średnie   | confirm/choice bez focus trap           | 16                                    |
| M5  | średnie   | `prompt()` w `conn-model`               | 17                                    |
| M6  | średnie   | ESLint / coverage rozbrojone            | 18                                    |
| M7  | średnie   | stringi poza `ui-wording.js`            | 19                                    |
| M8  | średnie   | undo = 80 pełnych SVG                   | kolejka 2                             |
| M9  | średnie   | zapis bez mutexa, boot bez blokady      | 5, 21                                 |
| M10 | średnie   | `cloneNode` przy każdym `render()`      | kolejka 2                             |
| L1  | niskie    | puste `catch`                           | 12 (cache), reszta kolejka 2          |
| L2  | niskie    | luki testów / brak E2E                  | testy w każdym kroku; E2E = kolejka 2 |
| L3  | niskie    | CSS w `index.html`                      | kolejka 2                             |
| L4  | niskie    | `clearEditorCache` niepełny             | 12                                    |
| L5  | niskie    | PRD 1.7 zaległy                         | 20                                    |
| L6  | niskie    | `fs.allow` + CVE devDeps                | 11                                    |

---

## Zasady zapisu (kroki 1–7 i 21)

1. Pamięć (`state` + `settingsCfg`) = kopia robocza.
2. Cache (localStorage + IndexedDB) = wyłącznie recovery po F5.
3. Dysk = SSOT, gdy jest grant folderu.
4. `saveProject()` dziś **nie zapisuje na dysk** — to cache. Nie polegaj na nazwie.
5. Dwa `persistNow` (main vs netlist-ui) robią coś innego — nie myl ich.

---

# Część A — Zapis (dane)

## Krok 1 — Modal ustawień nie kasuje spisu `(C1)`

**Cel:** `#setSave` aktualizuje tylko pola formularza; `sheetConnections` i `library` zostają.

**Czytaj:** `src/main.js` (~4949–5025), `src/sheet-connections.js`.

**Zrób:**

Nie buduj nowego obiektu w `#setSave`. Zachowaj `settingsCfg` i nadpisz wyłącznie: `orient`, `doc`, `serial`, `maker`, `version`, `sheet`, `norm`, `date`.

```js
Object.assign(settingsCfg, {
  orient: document.getElementById("setOrient").value,
  // …reszta pól formularza
});
```

Lepiej wyodrębnić `applySettingsForm(cfg, form)` do `src/project-settings.js` razem z `SETTINGS_DEFAULT`.

**Test:** `tests/settings-save.test.js`

- po apply zostaje `sheetConnections` i `library`
- puste pola formularza nie wstawiają `undefined` w te dwa klucze

**Done gdy:** test przechodzi; modal woła `applySettingsForm`; `npm test`.

**Nie ruszaj:** file-io, cache, netlist-ui, nazw funkcji.

---

## Krok 2 — Nazwy bez kłamstwa `(nazwy pod M1/M9)`

**Cel:** w kodzie widać, co idzie do cache, a co na dysk. Zero zmiany zachowania.

**Czytaj:** `src/main.js` (`persistNow`, `flushDoc`, `flushLibrary`, `saveProject`, `markDirty`), `src/netlist-ui.js` (`persistNow` ~71–78), `src/file-io.js`.

**Zrób (rename + alias, to samo ciało):**

| Dziś                        | Nowa nazwa             | Znaczenie                              |
| --------------------------- | ---------------------- | -------------------------------------- |
| `persistNow` w main         | `persistCache`         | LS + IDB                               |
| `saveProject` w main        | alias → `persistCache` | cache, nie dysk                        |
| `flushDoc` / `flushLibrary` | wołają `persistCache`  | bez nowej logiki                       |
| `persistNow` w netlist-ui   | `commitNetlist`        | sync + cache + (na razie) JSON na dysk |

**Test:** `tests/persistence.test.js`, `tests/file-io-dirty.test.js`, `tests/boot-cache.test.js` bez zmian asercji.

**Done gdy:** grep nie znajduje `persistNow` poza komentarzem „dawniej”; `npm test`.

**Nie ruszaj:** polityki dirty, scoringu, `#setSave`.

---

## Krok 3 — Jedna mapa dirty `(M1, baza pod 4–6)`

**Cel:** badge i Ctrl+S wiedzą o arkuszu, bibliotece i ustawieniach (spis).

**Czytaj:** `src/sheet-persistence.js`, `src/save-badge.js`, `src/project-perm-ui.js`, `src/main.js` (`markActiveDirty`, `syncDirtyIndicator`).

**Zrób:** nowy `src/project-dirty.js` (albo dopisz do `sheet-persistence.js`):

```js
{ sheetsDirty: number, libDirty: boolean, settingsDirty: boolean }
```

- `markLibDirty` / `clearLibDirty`
- `markSettingsDirty` / `clearSettingsDirty`
- `countDirtyAll` = arkusze + lib + settings
- `resolveSaveBadgeState` liczy settings jak lib

**Test:** `tests/save-badge.test.js` — `settingsDirty` przy 0 arkuszach → badge dirty.

**Done gdy:** badge pokazuje niezapisane przy samym brudnym spisie.

**Nie ruszaj:** `save()`, netlist-ui.

---

## Krok 4 — Biblioteka dirty `(H3/M9, badge kłamie)`

**Cel:** edycja symbolu zapala dirty; Ctrl+S nie nadpisuje czystego E-00.

**Czytaj:** `src/main.js` `markActiveDirty` (~4528), historia `onMutate`, `src/file-io.js` `saveProjectToDisk`.

**Zrób:**

1. `markActiveDirty`: przy `state.active === state.lib` → `markLibDirty`.
2. `saveFile` / `saveAs` lib: po sukcesie `clearLibDirty`.
3. `saveProjectToDisk`: lib tylko gdy `state.lib.dirty` (albo brak handle — pierwszy zapis).

**Test:** mock `lib.dirty === false` → `writeHandle` lib nie wołany.

**Done gdy:** rysowanie na bibliotece zapala badge; czysta lib nie leci na dysk.

**Nie ruszaj:** netlist autosave, scoring.

---

## Krok 5 — Ctrl+S: mutex, jeden przebieg, jeden toast `(M9)`

**Cel:** jedno kliknięcie = jeden zapis, bez podwójnego SVG i dwóch toastów.

**Czytaj:** `src/file-io.js` `save()`, `saveFile()`, `saveProjectToDisk()`.

**Zrób:**

1. Flaga `saving` — drugi `save()` wraca od razu.
2. Gdy jest `state.dir`: tylko `saveProjectToDisk()` (nie `saveFile` + disk).
3. Gdy nie ma `dir`: zostaw `saveFile` / `saveAs`.
4. Jeden `setStatus` na końcu.
5. `#btnSave` disabled na czas zapisu.

**Test:** przy `dir` → 0× osobnego `saveFile`; przy `saving` → brak drugiego write.

**Done gdy:** otwarty projekt + Ctrl+S = jeden toast.

**Nie ruszaj:** scoring, netlist-ui.

---

## Krok 6 — Spis nie zapisuje JSON sam `(spójność z C1/M1)`

**Cel:** edycja netlisty = `settingsDirty` + cache. `projekt.json` dopiero przy Ctrl+S.

**Czytaj:** `src/netlist-ui.js` `commitNetlist`, `src/connection-apply.js`, `src/netlist-routing.js` `persistConnections`, `src/main.js` `saveProjectSettings`.

**Zrób:**

1. `commitNetlist`: sync + `markSettingsDirty` + `persistCache`. Bez `saveProjectSettings()`.
2. `persistConnections`: to samo.
3. `saveProjectToDisk` już pisze JSON — po sukcesie `clearSettingsDirty`.
4. Migracja md → SSOT **może** pisać JSON od razu (import).

**Test:** po `commitNetlist` mock `saveProjectSettings` nie wołany; `settingsDirty === true`.

**Done gdy:** nowy wiersz spisu nie dotyka dysku; Ctrl+S zapisuje `sheetConnections`.

**Nie ruszaj:** scoring, `relinkHandles`.

---

## Krok 7 — Cache z rewizją; relink bez create `(M1)`

**Cel:** usunięcie arkusza aktualizuje cache; F5 nie wskrzesza starego SVG; relink nie tworzy phantom plików.

**Czytaj:** `src/boot-cache.js`, `src/main.js` `projectSnapshot`, `relinkHandles` (~5370).

**Zrób:**

1. Snapshot: `generation`. Zapis cache gdy `new.generation >= old`, **chyba że** nowy pusty a stary nie.
2. Usuń dominację `sheets * 1e9`.
3. `relinkHandles`: `getFileHandleByPath` **bez** `create: true`. Brak pliku → `handle = null`.

**Test:** `tests/boot-cache.test.js` — 4 arkusze + wyższe generation nadpisują 5; pusty nie nadpisuje pełnego.

**Done gdy:** powyższe + relink nie tworzy pliku.

**Nie ruszaj:** UI zapisu, netlista.

---

# Część B — Bezpieczeństwo

## Krok 8 — XSS w tabeli spisu `(H1)`

**Cel:** pola połączenia nie idą przez `innerHTML`.

**Czytaj:** `src/netlist-ui.js` `fillEditorTable` (~337–352). Wzorzec: `src/sidebar-lists.js` (`textContent` na `td`/`dd`).

**Zrób:** `document.createElement("td")` + `textContent` dla `id`, `from`, `to`, `net`, `wire`, `length`, `reason`. Zero konkatenacji HTML.

**Test:** `tests/security.test.js` albo `tests/netlist-ui-xss.test.js` (jsdom): payload `<img src=x onerror=alert(1)>` w `net` → brak węzła `img`, tekst widoczny.

**Done gdy:** grep `fillEditorTable` nie ma `innerHTML` z danymi rekordu.

**Nie ruszaj:** sanitize SVG, CSP, zapisu.

---

## Krok 9 — Sanitize SVG po parsowaniu `(H2, L2)`

**Cel:** po `DOMParser` zejdź po drzewie i zdejmij wektory, których regex nie widzi.

**Czytaj:** `src/svg-utils.js` `sanitizeSvgText` / `parseSvg`, `tests/security.test.js`.

**Zrób:** funkcja `sanitizeSvgDom(svg)` wołana z `parseSvg` po parse:

- usuń `script`, `foreignObject`, `iframe`, `embed`, `object`, `set`, `animate`, `animateTransform`, `animateMotion`
- zdejmij atrybuty `on*`
- `href` / `xlink:href`: zostaw tylko `#…` i względne ścieżki; zneutralizuj `javascript:`, `data:`, encje i `%XX` (sprawdzaj zdekodowaną wartość)

Regex przed parse może zostać jako pierwsza linia.

**Test:** dopisz do `tests/security.test.js`:

- `href="&#106;avascript:alert(1)"`
- niezamknięty `<script src=…>`
- `<set attributeName="onclick">`
- `<animate attributeName="href">`

**Done gdy:** wszystkie nowe wektory zneutralizowane po `parseSvg`; stare testy nadal zielone.

**Nie ruszaj:** `defs-assembler` polityki `<style>` (osobno, kolejka 2 jeśli potrzeba). Nie wyłączaj legalnych `#SymbolId`.

---

## Krok 10 — CSP lokalnie i na Vercel `(M2)`

**Cel:** te same twarde dyrektywy w prod i w `index.html` (dev / preview).

**Czytaj:** `vercel.json`, `index.html` (`<head>`).

**Zrób:**

1. `vercel.json`: dopisz `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`.
2. Ten sam ciąg jako `<meta http-equiv="Content-Security-Policy" …>` w `index.html` (dev bez nagłówków Vercel).
3. Nie ruszaj `style-src 'unsafe-inline'` — CSS nadal w HTML (L3 = kolejka 2).

**Test:** ręcznie sprawdź, że `npm run build` przechodzi; w CI już jest `build`. Nie dodawaj E2E.

**Done gdy:** meta i `vercel.json` mają ten sam zestaw dyrektyw.

**Nie ruszaj:** inline CSS, nonce.

---

## Krok 11 — Ścieżki i dev server `(M3, L6)`

**Cel:** zapis/odczyt nie wychodzi poza grant poza świadomym `../lib`; Vite nie serwuje katalogu nadrzędnego.

**Czytaj:** `src/project-files.js` `getFileHandleByPath`, `resolvePathViaParents`, `vite.config.js`.

**Zrób:**

1. `getFileHandleByPath`: rzuć, jeśli którykolwiek segment to `..` albo `.`.
2. `resolvePathViaParents`: jedyny legalny `..` — i tylko do wyszukania biblioteki (nie twórz plików po `..`).
3. `vite.config.js`: `fs.allow: [__dirname]` zamiast `path.resolve(__dirname, "..")`.

**Test:** `tests/project-paths.test.js` / `tests/project-files` — `getFileHandleByPath` z `../x` rzuca (zmockowany handle).

**Done gdy:** `..` w zwykłym zapisie jest odrzucane; `npm run dev` nadal serwuje edytor.

**Nie ruszaj:** logiki `ascendDirectoryHandles` poza jawnym reject przy create.

---

## Krok 12 — Cache: pełne czyszczenie + błąd quota `(M1, L4, L1)`

**Cel:** „wyczyść cache” czyści wszystko; użytkownik widzi, gdy kopia robocza nie weszła.

**Czytaj:** `src/persistence.js` `clearEditorCache`, `writeJsonCache`, `src/main.js` `persistCache`.

**Zrób:**

1. `clearEditorCache`: libDoc, project, prefs, settings + LS `edytor.lib`, `edytor.project`, `edytor.prefs`, `edytor.settings`.
2. `writeJsonCache`: gdy `localStorage.setItem` rzuca, nie połykaj bez śladu — zwróć `{ ok: false, reason: "quota" }`.
3. `persistCache`: przy `ok: false` toast ostrzegawczy (jedna linia `setStatus`).

**Test:** `tests/persistence.test.js` — clear zostawia puste klucze settings/prefs; write z pełnym mockiem quota → `ok: false`.

**Done gdy:** clear nie zostawia `edytor.settings`; quota nie jest cicha.

**Nie ruszaj:** scoringu (krok 7). Jeśli 7 nie zrobiony, nie zmieniaj `shouldWriteProjectCache`.

---

# Część C — Architektura (H3 w kawałkach)

## Krok 13 — Podepnij `createSelectionPropsUi` `(H3)`

**Cel:** jedna implementacja belki właściwości; kopia w `main.js` znika.

**Czytaj:** `src/selection-props-ui.js` (`createSelectionPropsUi`), `src/main.js` `syncSelectionProps` (~1777) i `initSelectionPropsForm`.

**Zrób:** w `main.js` wołaj `createSelectionPropsUi({...deps})` zamiast lokalnych funkcji o tej samej treści. Usuń martwą kopię. Zostaw w main tylko to, czego factory nie ma (promocja do lib, jeśli nadal tam siedzi — przenieś callbackiem).

**Test:** istniejące `tests/selection-props.test.js`, `tests/connection-fields.test.js`.

**Done gdy:** grep `function syncSelectionProps` jest tylko w `selection-props-ui.js`.

**Nie ruszaj:** `exportSymbol`, resolver imports, draw-mode.

---

## Krok 14 — `exportSymbol` przez SSOT defs `(H3)`

**Cel:** eksport symbolu nie skleja XML ręcznie.

**Czytaj:** `src/main.js` `exportSymbol` (~4754–4801), `src/defs-assembler.js` `assembleEditDefs` / `useColorAwareClone`.

**Zrób:** buduj dokument eksportu przez te same klony co podgląd (offscreen `<svg>` + `assembleEditDefs` albo mała `exportSymbolSvg(node, symbols)` w `defs-assembler.js`). Bez `symDefs += serialize`.

**Test:** `tests/` nowy lub dopisek — wyeksportowany markup ma `<defs>` z id symbolu i nie zawiera `javascript:`.

**Done gdy:** `exportSymbol` w main ma < 30 linii i nie składa stringów defs.

**Nie ruszaj:** selection-props, draw-mode.

---

## Krok 15 — Jeden import symboli + draw-mode w bootstrap `(H3)`

**Cel:** SSOT symboli i kolejność init zgodna z `ARCHITECTURE.md`.

**Czytaj:** `src/main.js` importy ~51 i ~82, `wireNetlistRouting` linia ~514 (`wireDrawMode()`), `src/app-bootstrap.js`, `src/symbol-service.js`.

**Zrób:**

1. `main.js` importuje `resolveLibSymbol` / `resolveSheetSymbol` **tylko** z `symbol-service.js` (re-eksport jeśli trzeba).
2. `wireDrawMode()` wołane z `bootstrapEditorSync`, nie z wnętrza `wireNetlistRouting`.

**Test:** `tests/bootstrap.test.js` — asercja kolejności jeśli już mockuje wire; `npm test`.

**Done gdy:** grep `from "./symbol-resolver.js"` w `main.js` = 0; draw-mode nie jest wewnątrz netlist wiring.

**Nie ruszaj:** logiki routera.

---

# Część D — UX, jakość, dokumentacja

## Krok 16 — Focus trap na confirm i choice `(M4)`

**Cel:** Tab nie ucieka pod modal.

**Czytaj:** `src/ui-dialog.js` `createConfirmDialog`, `createChoiceDialog`, `bindModalA11y`.

**Zrób:** oba dialogi inicjują `bindModalA11y` (jak `createAskTextDialog`). Escape / tło nadal anulują.

**Test:** `tests/ui-dialog-choice.test.js` / `tests/ui-dialog-route.test.js` — po `ask` pierwszy przycisk ma fokus; istnienie `aria-modal`.

**Done gdy:** confirm i choice używają `bindModalA11y`.

**Nie ruszaj:** wording, prompt.

---

## Krok 17 — Usuń `window.prompt` ze złączy `(M5)`

**Cel:** zgodność z PRD FR-43.

**Czytaj:** `src/conn-model.js` `promptConnMeta` (~372–385), wiring `askConnMeta` w `main.js`.

**Zrób:** gdy brak `askConnMeta`, zwróć `null` (albo rzuć w dev). Usuń `prompt(...)`. Upewnij się, że produkcja zawsze podaje `askConnMeta`.

**Test:** `tests/conn-model.test.js` — bez `askConnMeta` nie woła `prompt`; z mockiem zwraca `{ ref, pin }`.

**Done gdy:** grep `prompt(` w `src/` = 0 (poza komentarzem / `createAskTextDialog` fallback testowym — ten fallback też usuń, jeśli łatwo).

**Nie ruszaj:** CSS, PRD (krok 20).

---

## Krok 18 — ESLint i coverage w CI `(M6)`

**Cel:** martwy kod i puste catch widać; CI mierzy coverage.

**Czytaj:** `eslint.config.js`, `vitest.config.js`, `.github/workflows/ci.yml`.

**Zrób:**

1. `no-unused-vars`: error, ignore `^_`.
2. `no-empty`: `allowEmptyCatch: false` — **tylko** jeśli nie wybucha cały `src`. Jeśli wybucha: w tym kroku włącz wyłącznie `no-unused-vars` i napraw importy; catch zostaw na kolejce 2.
3. CI: `npm run test:coverage` (progi jak dziś, 25% — nie podnoś w tym kroku).
4. Nie włączaj `main.js` do coverage w tym kroku.

**Test:** `npm run lint` + `npm run test:coverage` lokalnie.

**Done gdy:** lint przechodzi; workflow ma krok coverage.

**Nie ruszaj:** logiki biznesowej.

---

## Krok 19 — Wording: statusy otwarcia i zapisu `(M7)`

**Cel:** jedna partia stringów w `ui-wording.js` — nie cały `main.js` naraz.

**Czytaj:** `src/ui-wording.js` `status`, `src/main.js` `setStatus("` (otwarcie projektu, import, ustawienia, `Anulowano rysowanie`).

**Zrób:** przenieś **tylko** statusy: błąd otwarcia folderu, import SVG, zapis ustawień, anulowanie rysowania / łamania. Nowe klucze w `status.*`. `tests/ui-wording.test.js` — nowe literały w `collectWordingStrings`.

**Done gdy:** te ścieżki nie mają gołych stringów w `setStatus("…")`.

**Nie ruszaj:** reszty ~50 statusów — kolejna partia = osobny krok (kolejka 2).

---

## Krok 20 — PRD i ARCHITECTURE `(L5)`

**Cel:** dokument = kod.

**Czytaj:** `PRD.md` §4 tabela „Spis połączeń”, §5 Could have validator, §9 ścieżki, §11; `ARCHITECTURE.md` dług.

**Zrób:**

1. Słownik: spis = `projekt.json` → `sheetConnections`; md tylko legacy/migracja.
2. Live validator → Should/Must (jest `#netlistHealth`).
3. Przykłady plików: Zasilanie / Bezpieczenstwo / … nie `E-01.svg` jako jedyny.
4. Wersja PRD → 1.8, data dnia commita.
5. ARCHITECTURE: odhacz to, co kroki 1–15 już zrobiły; zostaw `main.js` split jako otwarte.

**Done gdy:** w PRD nie ma sprzeczności „spis = polaczenia_*.md” jako SSOT.

**Nie ruszaj:** kodu.

---

## Krok 21 — Overlay boot `(M9 reszta)`

**Cel:** toolbar nie przyjmuje edycji, zanim `_noSave = false`.

**Czytaj:** `src/main.js` IIFE `boot` (~5575), `index.html` `#toolbar` / `#stage`.

**Zrób:** na `body` klasa `is-booting` (pointer-events none na toolbar+stage) od startu skryptu; zdejmij po `_noSave = false` (także w `catch` boot). Jeden komunikat w `#status` „Wczytywanie…”.

**Test:** jeśli trudny bez jsdom całej apki — test klasy na małej funkcji `setBootLock(on)` + ręczne 30 s. Nie blokuj kroku na E2E.

**Done gdy:** boot nie pozwala kliknąć Zapisz / rysuj zanim skończy load.

**Nie ruszaj:** file-io (krok 5).

---

# Kolejka 2 — nie w tej samej serii co 1–21

Rób dopiero po części A–D. Nadal jeden krok = jedno okno.

| Krok | Finding | Cel w jednym zdaniu                                                                                                                                                                                  |
| ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22   | M10     | `render()`: nie wołaj `rebuildEditDefs`, gdy symbole się nie zmieniły                                                                                                                                |
| 23   | M8      | historia: limit 80 zostaje; snapshot tylko aktywnego dokumentu (już tak jest?) albo kompresja — zmierz, potem tnij                                                                                   |
| 24   | L3      | wynieś CSS z `index.html` do `src/app.css` (bez zmiany wyglądu)                                                                                                                                      |
| 25   | L1      | zamień puste `catch` w `relinkHandles` / `persistCache` na `console.warn` + toast                                                                                                                    |
| 26   | M7      | druga partia `setStatus` → `ui-wording`                                                                                                                                                              |
| 27   | H2      | nie klonuj surowego `<style>` z niezaufanego SVG albo ogranicz selektory                                                                                                                             |
| 28   | L2      | jeden test integracyjny jsdom: otwórz fixture arkusza + `inlineSheetDefsSafe` ma `<defs>`                                                                                                            |
| 29   | L6      | `npm audit` devDeps — tylko jeśli nie psuje lockfile bez powodu — **zrobione** (`npm audit fix`, bez `--force`). Zostaje GHSA-82fw-gwwq-j7x9 w Vitest 3 (łatka od 4.1.11; skok na v5 poza zakresem). |
| 30   | L2      | E2E Playwright CS-TB-48 (symbole G1/F1 na Zasilaniu) — osobny setup — **zrobione** (`npm run test:e2e`, mock FS Access, fixture Zasilanie).                                                          |

---

## Kolejność

```
Część A (zapis)          1 → 2 → 3 → 4 → 5 → 6    7 niezależnie od 4–6
Bezpieczeństwo           8 (po 1, nie blokuje A)   9   10   11   12 (po 7 jeśli ruszasz cache)
Architektura H3          13   14   15   — nie w jednym oknie
UX / jakość              16   17   18   19   20   21
Kolejka 2                po 21
```

**Można równolegle w osobnych oknach (różne pliki):** 8, 10, 16, 20.
**Nie równolegle:** 4+5, 5+6, 7+12, 13+cokolwiek w `main.js` `syncSelectionProps`.

Priorytet, jeśli jest czas na jeden krok: **1 (C1)**, potem **8 (H1)**.
