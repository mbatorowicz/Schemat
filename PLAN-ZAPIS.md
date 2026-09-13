# Plan: jeden mechanizm zapisu

Każdy krok jest zamknięty: cel, pliki, zmiana, test, kryterium „done”.
Wykonuj **jeden krok na jedno okno kontekstu**. Nie łącz kroków.
Na starcie kroku przeczytaj tylko ten plik + wymienione źródła — nie cały audyt.

Stan: `src/` · Vite · Vitest. Po kroku: `npm test` + `npm run lint`.
Nie rób force push, nie zmieniaj git config.

---

## Zasady (wszystkie kroki)

1. Pamięć (`state` + `settingsCfg`) = kopia robocza.
2. Cache (localStorage + IndexedDB) = wyłącznie recovery po F5.
3. Dysk = SSOT, gdy jest grant folderu.
4. `saveProject()` dziś **nie zapisuje na dysk** — to cache. Nie polegaj na nazwie.
5. Dwa `persistNow` (main vs netlist-ui) robią coś innego — nie myl ich.

---

## Krok 1 — Modal ustawień nie kasuje spisu

**Cel:** `#setSave` aktualizuje tylko pola formularza; `sheetConnections` i `library` zostają.

**Czytaj:** `src/main.js` (~4949–5025), `src/sheet-connections.js`.

**Zrób:**

W `document.getElementById("setSave").onclick` nie buduj nowego obiektu.
Zachowaj istniejący `settingsCfg` i nadpisz wyłącznie: `orient`, `doc`, `serial`, `maker`, `version`, `sheet`, `norm`, `date`.

```js
Object.assign(settingsCfg, {
  orient: document.getElementById("setOrient").value,
  // …reszta pól formularza
});
```

**Test:** nowy plik `tests/settings-save.test.js` (wyodrębnij czystą funkcję, np. `applySettingsForm(cfg, form)` w małym module albo na górze `main` jeśli nie chcesz nowego pliku — **lepiej** `src/project-settings.js` z `SETTINGS_DEFAULT` + `applySettingsForm`).

Przypadki:

- po apply zostaje `sheetConnections` i `library`
- puste pola formularza nie wstawiają `undefined` w te dwa klucze

**Done gdy:** test przechodzi; modal w `main.js` woła tę funkcję; `npm test`.

**Nie ruszaj:** file-io, cache, netlist-ui, nazw funkcji.

---

## Krok 2 — Nazwy bez kłamstwa (bez zmiany zachowania)

**Cel:** w kodzie widać, co idzie do cache, a co na dysk.

**Czytaj:** `src/main.js` (`persistNow`, `flushDoc`, `flushLibrary`, `saveProject`, `markDirty`), `src/netlist-ui.js` (`persistNow` ~71–78), `src/file-io.js`.

**Zrób (rename + alias tymczasowy, to samo ciało):**

| Dziś | Nowa nazwa | Znaczenie |
|------|------------|-----------|
| `persistNow` w main | `persistCache` | LS + IDB |
| `saveProject` w main | `schedulePersistCache` albo zostaw alias `saveProject = persistCache` jeden release | cache, nie dysk |
| `flushDoc` / `flushLibrary` | wołają `persistCache` | bez nowej logiki |
| `persistNow` w netlist-ui | `commitNetlist` | sync pamięci + cache + (na razie) JSON na dysk |

Zostaw `saveProject` jako alias, jeśli jest dużo call-site — w tym kroku **nie** zmieniaj kiedy coś się zapisuje.

**Test:** istniejące `tests/persistence.test.js`, `tests/file-io-dirty.test.js`, `tests/boot-cache.test.js` bez zmian zachowania.

**Done gdy:** grep nie znajduje `persistNow` poza komentarzem „dawniej”; `npm test`.

**Nie ruszaj:** polityki dirty, scoringu cache, `#setSave` (już zrobione w kroku 1).

---

## Krok 3 — Jedna mapa dirty

**Cel:** badge i Ctrl+S wiedzą o arkuszu, bibliotece i ustawieniach (spis).

**Czytaj:** `src/sheet-persistence.js`, `src/save-badge.js`, `src/project-perm-ui.js`, `src/main.js` (`markActiveDirty`, `syncDirtyIndicator`).

**Zrób:**

Rozszerz SSOT dirty (nowy `src/project-dirty.js` albo dopisz do `sheet-persistence.js`):

```js
{ sheetsDirty: number, libDirty: boolean, settingsDirty: boolean }
```

- `markSheetDirty` / `clearSheetDirty` — bez zmian semantyki arkuszy
- `markLibDirty` / `clearLibDirty` — `state.lib.dirty`
- `markSettingsDirty` / `clearSettingsDirty` — flaga na `settingsCfg` albo obok niego (`_settingsDirty`)
- `countDirtyAll(...)` = arkusze + lib + settings
- `resolveSaveBadgeState` liczy settings tak samo jak lib

Podłącz `syncDirtyIndicator` do `countDirtyAll`.

**Test:** `tests/save-badge.test.js` + nowy/rozszerzony test dirty (settings=true → badge dirty nawet przy 0 arkuszach).

**Done gdy:** badge pokazuje niezapisane przy samym brudnym spisie; `npm test`.

**Nie ruszaj:** jeszcze nie zmieniaj `save()` ani netlist-ui (krok 4–6). Flaga settings na razie ustawiana ręcznie w 2–3 miejscach albo wcale — wystarczy API i badge.

---

## Krok 4 — Biblioteka: dirty przy edycji, zapis tylko gdy brudna

**Cel:** edycja symbolu zapala dirty; Ctrl+S nie nadpisuje czystego E-00.

**Czytaj:** `src/main.js` `markActiveDirty` (~4528), `onMutate: markActiveDirty` w historii, `src/file-io.js` `saveProjectToDisk` (blok `state.lib`).

**Zrób:**

1. `markActiveDirty`: jeśli `state.active === state.lib` → `markLibDirty()`, nie return bez nic.
2. `saveFile` / `saveAs` przy bibliotece: po udanym zapisie `clearLibDirty`.
3. `saveProjectToDisk`: zapisuj lib **tylko** gdy `state.lib.dirty` (albo brak handle i trzeba utworzyć plik).

**Test:** unit na `markActiveDirty` jeśli wyodrębnisz 5 linii; file-io — mock state z `lib.dirty === false` → `writeHandle` lib nie wołany.

**Done gdy:** historia/rysowanie na bibliotece zapala badge; czysta lib nie leci na dysk przy Ctrl+S.

**Nie ruszaj:** netlist autosave, scoring cache.

---

## Krok 5 — Ctrl+S: mutex, jeden przebieg, jeden toast

**Cel:** jedno kliknięcie = jeden zapis projektu, bez podwójnego SVG i dwóch toastów.

**Czytaj:** `src/file-io.js` `save()`, `saveFile()`, `saveProjectToDisk()`.

**Zrób:**

1. Flaga `saving` — drugi `save()` wraca od razu (albo kolejkuj jeden retry).
2. Gdy jest `state.dir`: **nie** wołaj `saveFile()` + `saveProjectToDisk()`. Wołaj tylko `saveProjectToDisk()` (aktywny arkusz jest w `state.sheets` i ma `dirty`).
3. Gdy nie ma `state.dir`: zostaw `saveFile()` / `saveAs()`.
4. Jeden `setStatus` na końcu. `saveFile` nie toastuje, gdy wołany z `save()` — albo w ogóle nie jest wołany (pkt 2).
5. Przycisk Zapisz `disabled` na czas zapisu, jeśli to 5 linii w main.

**Test:** `tests/file-io-dirty.test.js` albo nowy test `save` z mockami: przy `dir` → 1× `saveProjectToDisk`, 0× osobnego `saveFile`; przy `saving=true` → brak drugiego write.

**Done gdy:** otwarty projekt + Ctrl+S = jeden toast „Zapisano projekt (…)”.

**Nie ruszaj:** cache scoring, netlist-ui.

---

## Krok 6 — Spis nie zapisuje JSON sam

**Cel:** edycja netlisty = `settingsDirty` + cache. `projekt.json` dopiero przy Ctrl+S (albo przy pagehide, jeśli już zapisujesz cache — **nie** przy każdym wierszu).

**Czytaj:** `src/netlist-ui.js` `commitNetlist` / dawny `persistNow`, `src/connection-apply.js` (`persist`), `src/netlist-routing.js` `persistConnections: () => saveProjectSettings()`, `src/main.js` `saveProjectSettings`.

**Zrób:**

1. `commitNetlist`: `syncNetlistToProject` + `markSettingsDirty` + `persistCache`. **Bez** `saveProjectSettings()`.
2. `persistConnections` w main: to samo (dirty + cache), nie zapis na dysk.
3. `saveProjectToDisk` już woła `saveProjectSettings` — po sukcesie `clearSettingsDirty`.
4. Migracja md → SSOT (jednorazowa) **może** nadal pisać JSON od razu — to import, nie edycja.

**Test:** netlist-ui / sheet-connections: po `commitNetlist` mock `saveProjectSettings` nie wołany; `settingsDirty === true`.

**Done gdy:** dodanie wiersza w edytorze spisu nie dotyka dysku; Ctrl+S zapisuje `sheetConnections`.

**Nie ruszaj:** scoring cache, `relinkHandles`.

---

## Krok 7 — Cache z rewizją; relink bez tworzenia plików

**Cel:** usunięcie arkusza aktualizuje cache; F5 nie wskrzesza starego SVG; relink nie tworzy phantom plików.

**Czytaj:** `src/boot-cache.js` (`projectCacheScore`, `shouldWriteProjectCache`), `src/main.js` `persistCache` / `projectSnapshot`, `relinkHandles` (~5370).

**Zrób:**

1. Snapshot: `generation` (monotoniczny, `Date.now()` albo `++` w pamięci). `shouldWriteProjectCache`: zapisz gdy `new.generation >= old.generation`, **chyba że** nowy jest pusty a stary nie (ochrona przed pustym bootem).
2. Usuń dominację `sheets * 1e9` jako jedynego kryterium.
3. `relinkHandles`: `getFileHandleByPath(dir, sh.relPath)` **bez** `create: true`. Brak pliku = `handle = null`, nie twórz.
4. Testy w `tests/boot-cache.test.js` + `tests/project-paths.test.js` / nowy test relink jeśli wyodrębnisz funkcję.

**Done gdy:**

- snapshot z 4 arkuszami i wyższym `generation` nadpisuje cache z 5
- pusty snapshot nie nadpisuje pełnego
- relink nie tworzy pliku

**Nie ruszaj:** UI zapisu, netlista.

---

## Kolejność i zależności

```
1 (C1, dane)     → można wgrać osobno, natychmiast
2 (nazwy)        → ułatwia resztę, zero ryzyka produktowego
3 (mapa dirty)   → baza pod 4–6
4 (lib dirty)    → wymaga 3
5 (Ctrl+S)       → wymaga 4 (żeby nie przestać zapisywać lib)
6 (netlista)     → wymaga 3 + 5 (JSON idzie tylko w saveProjectToDisk)
7 (cache/relink) → niezależny od 4–6; nie łącz z 5 w jednym oknie
```

Po każdym kroku: commit z komunikatem `fix(save): …` / `refactor(save): …` i push na remote (zwykły push, nie force).

---

## Poza zakresem tego planu

- XSS w `netlist-ui` innerHTML (osobny fix, 20 min)
- Sanityzacja SVG po DOMParser
- Rozbicie `main.js`
- E2E CS-TB-48

Te rzeczy nie blokują kroków 1–7.
