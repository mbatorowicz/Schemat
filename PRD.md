# PRD — Edytor schematów i symboli (CS-TB-48)

|                      |                                           |
| -------------------- | ----------------------------------------- |
| **Produkt**          | `Schemat/` (Vite, `npm run dev`)          |
| **Projekt**          | Transporter boczny do drukarki · CS-TB-48 |
| **Wytwórca**         | CNC Solutions                             |
| **Norma**            | EN 60204-1 (schematy elektryczne maszyn)  |
| **Wersja dokumentu** | 1.7 · 2026-07-19                          |

---

## 1. Cel produktu

Lokalny edytor SVG do tworzenia i utrzymania dokumentacji elektrycznej maszyny: wspólnej biblioteki symboli, arkuszy schematów (E-01…) oraz powiązanego spisu połączeń. Edytor jest źródłem plików trafiających do DTR (`build/dtr.pdf`) i dokumentacji wytwórczej.

**Główna wartość:** jeden workflow od symbolu → instancji na schemacie → wpisu w netliście → trasowania przewodu.

---

## 2. Użytkownicy

| Persona                         | Potrzeba                                                  |
| ------------------------------- | --------------------------------------------------------- |
| Konstruktor elektryczny         | Rysuje schemat, definiuje złącza, utrzymuje spis połączeń |
| Wytwórca maszyn (CNC Solutions) | Standaryzuje symbole, numeruje instancje (G1, WD1, SK1…)  |
| Audytor / klient                | Otrzymuje spójny SVG + PDF bez dostępu do edytora         |

---

## 3. Zakres

### W zakresie (MVP+)

- Otwieranie folderu projektu (`projekt.json`, `*.svg`, `polaczenia_*.md`)
- Biblioteka symboli wspólna (`lib/E-00_symbole.svg`)
- Edycja arkuszy schematów (ramka A4, tabelka dokumentu)
- Rysowanie kształtów geometrycznych (linia, prostokąt, koło, łuk, tekst)
- Złącza elektryczne: **punkt** (zacisk na schemacie) i **kreska** (przyłącze w symbolu)
- Oznaczenia pomocnicze: węzeł topologii, etykieta pinu
- Instancje symboli (`<use data-ref>`) z auto-numeracją
- Spis połączeń (Markdown), trasowanie ortogonalne, propozycje nowych połączeń
- Styl zaznaczenia (obrys, wypełnienie, tekst), undo/redo, schowek
- Zapis na dysk (File System Access API) + kopia robocza (IndexedDB)

### Poza zakresem

- Symulacja PLC, obliczenia prądów, wybór przekroju przewodu
- Współpraca wielu użytkowników, wersjonowanie w chmurze
- Edycja schematów pneumatycznych P-01 w tym samym narzędziu (osobny proces)
- Import z CAD / EPLAN

---

## 4. Pojęcia domenowe

| Termin              | Znaczenie                                       | Reprezentacja SVG                                                 |
| ------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| **Symbol (typ)**    | Definicja graficzna w bibliotece                | `<g id="WD">` w E-00                                              |
| **Instancja**       | Wystąpienie symbolu na schemacie                | `<use data-ref="WD1" href="#WD">`                                 |
| **Złącze — punkt**  | Zacisk / listwa na schemacie                    | `<g data-role="conn" data-kind="point">` — widoczne kółko         |
| **Złącze — kreska** | Przyłącze kierunkowe w symbolu                  | `<g data-role="conn" data-kind="lead">` — widoczna linia          |
| **Pin**             | Nazwa przyłącza w netliście                     | `data-pin` na złączu, np. `L`, `N`, `1`                           |
| **Punkt styku**     | Geometryczny punkt łączenia przewodu ze złączem | `<circle data-part="contact" data-contact="…">` — czerwony marker |
| **Węzeł**           | Punkt pomocniczy do łamania linii               | `<circle class="node">`                                           |
| **Etykieta pinu**   | Sam tekst bez semantyki złącza                  | `<text class="pin">`                                              |
| **Spis połączeń**   | Tabela połączeń elektrycznych                   | `polaczenia_E-01.md`                                              |
| **Endpoint**        | Adres w netliście                               | `WD1:L`, `X1:3`                                                   |

### Model złącza (XOR wizualny)

```xml
<g data-role="conn" data-kind="point|lead"
   data-pin="L" data-ref="WD1" data-dir="N" data-len="25" data-joint-r="4">
  <line data-part="stub" class="conn-stub"/>
  <circle data-part="joint" class="conn-joint"/>
  <circle data-part="contact" data-contact="N|E|S|W|tip" class="conn-contact" r="1.5"/>
  <text data-part="label" class="pin"/>
</g>
```

| `data-kind` | Widoczne      | Ukryte         | Punkty styku                      | Uchwyty                      |
| ----------- | ------------- | -------------- | --------------------------------- | ---------------------------- |
| `point`     | joint (kółko) | stub           | 4× na obwodzie (N, E, S, W)       | środek + promień + etykieta  |
| `lead`      | stub (kreska) | joint (anchor) | 1× na końcu linii (`tip` = x2,y2) | początek + koniec + etykieta |

### Styl złącza

- Kolor obrysu/linii złącza = kolor symbolu (`.sym`: `#0f172a`, grubość 1.5).
- **Punkt:** `fill: none` — bez białego wypełnienia.
- **Kreska:** tylko widoczna linia `conn-stub` (`stroke-linecap: butt` — bez kropki na końcu); joint ma `r=0`, `display:none`.
- **Punkty styku:** wypełnienie czerwone (`#dc2626`), promień `r = grubość_linii / 2` (średnica ≤ grubość), nie podlegają edycji koloru z paska stylu.
- Snap linii połączeniowych i trasowanie netlisty celują w **punkty styku**, nie w środek jointa.
- **Punkt (`point`):** 4 markery na obwodzie to **jeden logiczny styk** — router przy trasowaniu wybiera najlepszą stronę (N/E/S/W) względem drugiego końca połączenia; użytkownik nie ustawia kierunku ręcznie.

### Id symboli (konwencja E-00)

- Kanoniczne `id` w bibliotece: krótkie kody (`WD`, `Q`, `PSU`, `SK1`, `X-3`, `X-4`, `NO`, `F1`…).
- Stare nazwy są mapowane przy migracji (`symbol-aliases.js`): np. `Przylacze`→`WD`, `Xx-3`→`X-3`, `sk1`→`SK1`.
- Instancja na arkuszu: `<use href="#WD" data-sym="WD" data-ref="WD1">` — `href` i `data-sym` muszą wskazywać kanoniczne id z biblioteki.

---

## 5. User stories (MoSCoW)

### Must have

- Jako konstruktor dodaję przyłącza L/N/PE jako **kreski** w symbolu WD.
- Jako konstruktor dodaję zaciski listwy X1 jako **punkty** na schemacie E-01.
- Jako konstruktor wstawiam symbol z biblioteki i otrzymuję auto-numerację (WD1, G1…).
- Jako konstruktor wczytuję spis połączeń i trasuję wybrane połączenie.
- Jako konstruktor zapisuję projekt do folderu bez utraty zmian.

### Should have

- Jako konstruktor edytuję styl zaznaczonych elementów z paska kontekstowego.
- Jako konstruktor klonuję złącze z auto-inkrementacją pinu.
- Jako konstruktor widzę podgląd rysowania bez mylących markerów.

### Could have

- Walidator spójności netlisty vs schemat w czasie rzeczywistym.

### Won't have (na razie)

- Edytor wielu użytkowników online.

---

## 6. Wymagania funkcjonalne

### 6.1 Projekt i pliki

- FR-01: Otwarcie folderu projektu z `showDirectoryPicker` lub fallback `<input type=file>`.
- FR-02: Rekurencyjne skanowanie folderu: arkusze `sch-*` (np. `project/CS-TB-48/E-01.svg`), biblioteka `lib/E-00_symbole.svg`, spisy `polaczenia_<arkusz>.md`.
- FR-03: Wczytanie `projekt.json` (orientacja A4, metadane dokumentu, pole `library` ze ścieżką względną do biblioteki).
- FR-03a: Konwencja nazw: `E-01.svg` ↔ `polaczenia_E-01.md`; biblioteka domyślnie `lib/E-00_symbole.svg`.
- FR-03b: Po otwarciu projektu automatyczne wczytanie biblioteki i spisu połączeń powiązanego z aktywnym arkuszem (preferowany plik w tym samym podfolderze co arkusz).
- FR-04: Zapis nadpisujący i „zapisz jako” dla aktywnego pliku SVG.
- FR-05: Przywracanie dostępu do folderu (IndexedDB) po restarcie przeglądarki.

### 6.2 Biblioteka symboli

- FR-10: Jedna biblioteka `E-00_symbole.svg` współdzielona między projektami.
- FR-11: CRUD symboli (nowy, duplikuj, eksportuj, usuń, zmień id).
- FR-12: Miniatury symboli w panelu bocznym.
- FR-13: Meta symbolu w bibliotece: **Nazwa** (`data-symbol-name`, tylko lib), **Oznaczenie** = prefix bez numeru (`data-inst-prefix`), **Opis** (`data-symbol-desc`) + numeracja (`data-inst-numbered`, `data-inst-start`); lista: nazwa z podtytułem oznaczenia.
- FR-13a: Na schemacie dwa napisy przy instancji: oznaczenie (`data-label="desig"`, `-SB1`) i opis (`data-label="desc"`). Belka: prefix | Nr (lokalny) | Opis; zmiana prefixu/opisu pyta: tylko schemat vs biblioteka (do lib bez numeru).

### 6.3 Arkusz schematu

- FR-20: Nowy arkusz A4 z ramką i tabelką dokumentu.
- FR-21: Wstawianie `<use>` z auto-`data-ref`.
- FR-22: Etykiety instancji (`text[data-owner-ref]`): desig + opcjonalnie desc.
- FR-24: Lista elementów aktywnego arkusza (bez ramki A4 i tabelki); grupowanie po `data-ref` / `data-owner-ref`; kliknięcie → panel `#elemProps` **tylko do odczytu**; edycja prefixu / nr / opisu / pin / treści / symbolu / długości kreski na belce `#selectionPropsGroup` (także przy zaznaczeniu grupy instancji).
- FR-25: Wstawianie instancji z listy symboli (przycisk **+**); oznaczenie konfigurowane w bibliotece; spis połączeń w `#netlistGroup` (nie w panelu właściwości).
- FR-26: Inline rename list (dblclick / F2): tytuł schematu (`data-sheet-title`, bez rename pliku na dysku), nazwa symbolu; nazwa pliku biblioteki / folderu projektu — `#resourceNameGroup`.

### 6.4 Rysowanie

- FR-30: Tryby klik-klik: linia/łamana, prostokąt, koło, łuk, tekst.
- FR-30a: Ustawienia paska stylu (grubość, kolor, przerywanie) są zapamiętywane jako domyślne dla nowych elementów i stosowane przy każdym wstawianiu.
- FR-31: Snap do siatki i do endpointów złączy przy rysowaniu linii połączeniowych.
- FR-32: Podgląd na żywo (HUD współrzędnych).
- FR-33: Baner trybu rysowania złącza; nazwy zasobów na listach / belce kontekstowej (bez breadcrumb).

### 6.5 Złącza

- FR-40: **Kreska** — 2 kliki, min. długość = krok siatki; modal `#connMeta` (ref + pin); kierunek wynika z geometrii dwóch klików (`data-dir`).
- FR-41: **Punkt** — 1 klik; modal `#connMeta` (ref + pin); bez ręcznego kierunku — jeden logiczny styk, strona N/E/S/W wybierana przy trasowaniu.
- FR-42: Edycja uchwytami jak zwykłe kształty (bez nakładania kółka na kreskę).
- FR-43: Podwójne kliknięcie / edycja — fokus pól na belce `#selectionPropsGroup` (bez `prompt()`): pin/ref; dla kreski także długość i kierunek; dla `<use>` prefix + nr + opis + wybór symbolu; dla tekstu / etykiety złącza — treść. Modal `#connMeta` tylko przy **tworzeniu** złącza. Dialog `#choiceDialog` przy promocji prefixu/opisu do biblioteki.
- FR-44: Migracja `term→point`, `stub→lead` przy starcie.
- FR-45: Automatyczne punkty styku — punkt: 4 na obwodzie; kreska: 1 na końcu linii.
- FR-46: Kolor złącza domyślnie jak symbol; punkty styku zawsze czerwone.
- FR-47: `migrateConnModel()` uzupełnia brakujące `data-part="contact"` w istniejących złączach.
- FR-48: SSOT stylów złączy w `src/conn-theme.js`; `syncConnStylesInLib()` synchronizuje CSS w E-00.
- FR-49: `resolveConnectionEndpoints()` + `conn-contact-pick.js` — wzajemny hint końców; `connEndpointCoords(g, mapXY, towardXY)` wybiera najlepszy punkt styku punktu.

### 6.5a SSOT złączy (`conn-theme.js`)

| Stała / funkcja            | Znaczenie                                                  |
| -------------------------- | ---------------------------------------------------------- |
| `CONN_THEME`               | stroke, strokeWidth, contactFill, stubLinecap, pointJointR |
| `readConnStrokeWidth(g)`   | Grubość z inline stub/joint                                |
| `connContactRadius(g)`     | `readConnStrokeWidth / 2`                                  |
| `connAllCss()`             | Generator `.conn-stub`, `.conn-joint`, `.conn-contact`     |
| `styleConnContact()`       | Jednolity styl punktów styku (point + lead)                |
| `syncConnStylesInLib(svg)` | Wstrzyknięcie CSS do biblioteki przy load/save             |

### 6.5b Wybór styku punktu (`conn-contact-pick.js`)

| Funkcja                                        | Znaczenie                                                     |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `pickPointContactByToward(contacts, towardXY)` | Wybór styku N/E/S/W najbliższego kierunkowi do drugiego końca |
| `bestPointContact(g, mapXY, towardXY)`         | Wrapper na `conn-model.js` — współrzędne wybranego styku      |

### 6.6 Netlista

- FR-50: Auto-wczytanie `polaczenia_<arkusz>.md` przy otwarciu projektu.
- FR-51: Parsowanie tabeli (`src/netlist-model.js`, ESM).
- FR-52: Trasowanie ortogonalne (`src/orthogonal-router.js`); SSOT kolorów przewodów w `src/wire-theme.js`.
- FR-53: Eksport propozycji zmian spisu po ręcznym rysowaniu przewodów.
- FR-54: `syncRoutedPointDir()` — po trasowaniu ustawia `data-dir` punktów na arkuszu (nie w definicji symbolu w bibliotece).

### 6.7 Styl i edycja

- FR-60: Pasek kontekstowy: układ, kolor, obrys, wypełnienie, tekst.
- FR-61: Undo/redo (80 kroków), kopiuj/wytnij/wklej, klonuj, usuń.
- FR-62: Odbicie i obrót zaznaczenia.

### 6.8 Widok

- FR-70: Pan (Shift+przeciąganie), zoom (kółko), dopasuj do widoku.
- FR-71: Siatka 1 / 2.5 / 5 mm, przełącznik snap i uchwytów.

---

## 7. Wymagania niefunkcjonalne

| ID     | Wymaganie                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-01 | Działanie offline po wczytaniu projektu                                                                                                                      |
| NFR-02 | Chrome / Edge (File System Access API)                                                                                                                       |
| NFR-03 | Vite (`Schemat/`: `npm run dev` / `npm run build` / deploy Vercel)                                                                                           |
| NFR-04 | SVG jako format wymiany (kompatybilny z build DTR)                                                                                                           |
| NFR-05 | Język UI: polski                                                                                                                                             |
| NFR-06 | Testy jednostkowe (`npm test`, Vitest): netlista, złącza, toolbar/selection-props, history, dirty/save, sanitize SVG; CI: lint + format:check + test + build |

---

## 8. UX — belka narzędziowa

### Linia główna (`#toolbarMode`)

1. **Plik** — otwórz, zapisz (+ badge uprawnień)
2. **Historia + schowek** — cofnij / ponów / kopiuj / wytnij / wklej
3. **Rysuj** — linia, prostokąt, koło, łuk, tekst
4. **Złącza / oznaczenia** (`#leadGroup`) — kreska, punkt, węzeł, pin
5. **Połączenia** — spis, trasowanie, eksport, `#netlistHealth`
6. **Akcje biblioteki** — gdy aktywna biblioteka
7. **Więcej** — nowy schemat / biblioteka / projekt, siatka, …
8. **Widok** — zoom, ustawienia

### Linia kontekstowa (`#toolbarContext`)

- Styl zaznaczenia (obrys / wypełnienie / tekst)
- `#libSymbolMetaGroup` — meta symbolu w bibliotece
- `#resourceNameGroup` — rename pliku biblioteki / folderu projektu
- `#selectionPropsGroup` — właściwości zaznaczenia na schemacie:
  - `<use>`: Oznaczenie + Symbol (select)
  - złącze: Oznaczenie + Pin; kreska dodatkowo Długość + Kierunek
  - tekst / etykieta złącza: Treść
- `#arrangeGroup` — wyrównanie (6), odbicie, obrót, klon, usuń

### Zasady UX

- Tooltipy narzędzi rysowania krótkie: Kreska, Punkt, Węzeł, Pin; wyrównania mogą mieć dłuższe `title`.
- Edycja meta zaznaczenia **na belce** (Enter/Esc); `#elemProps` tylko podgląd.
- Modal zamiast `prompt()` / `confirm()` (tworzenie złącza: `#connMeta`; potwierdzenia: `ui-dialog`).
- Badge zapisu: `Zapisano` / `N niezapisane` / **Przywróć dostęp**.
- Empty state sidebara z CTA „Otwórz projekt”; overlay skrótów (`?`).
- Health spisu (`#netlistHealth`) na żywo po `render` / zmianie arkusza (debounce ~180 ms).

---

## 9. Integracje

| Plik                                           | Rola                                                      |
| ---------------------------------------------- | --------------------------------------------------------- |
| `Schemat/index.html`                           | Aplikacja edytora (Vite), modal `#connMeta`               |
| `Schemat/src/main.js`                          | UI, routing, integracja modułów                           |
| `Schemat/src/draw-mode.js`                     | Tryb rysowania (punkty, preview, finish)                  |
| `Schemat/src/sidebar-lists.js`                 | Listy sidebara (symbole, arkusze, elementy)               |
| `Schemat/src/netlist-ui.js`                    | UI spisu połączeń + live validator                        |
| `Schemat/src/file-io.js`                       | Zapis/odczyt plików                                       |
| `Schemat/src/element-factory.js`               | Fabryka elementów SVG                                     |
| `Schemat/src/dom-selectors.js`                 | Bezpieczne selektory CSS                                  |
| `Schemat/src/conn-theme.js`                    | SSOT stylów złączy                                        |
| `Schemat/src/conn-model.js`                    | Model złączy, `connEndpointCoords`                        |
| `Schemat/src/symbol-aliases.js`                | Mapowanie starych id symboli → kanoniczne (WD, X-3, SK1…) |
| `Schemat/src/netlist-model.js`                 | Parser i klasy przewodów (ESM)                            |
| `Schemat/src/orthogonal-router.js`             | Trasowanie ortogonalne                                    |
| `Schemat/src/wire-theme.js`                    | Kolory i style przewodów netlisty                         |
| `Schemat/src/history.js`                       | Undo/redo                                                 |
| `Schemat/src/svg-utils.js`                     | Pomocnicze operacje SVG, sanityzacja                      |
| `Schemat/src/instance-refs.js`                 | Numeracja i edycja `data-ref`                             |
| `Schemat/src/sheet-elements.js`                | Lista elementów arkusza                                   |
| `Schemat/src/project-files.js`                 | Otwieranie/zapis projektu                                 |
| `Schemat/tests/core.test.js`                   | Testy Vitest                                              |
| `schematy/lib/E-00_symbole.svg`                | Biblioteka symboli                                        |
| `schematy/project/CS-TB-48/Zasilanie.svg`      | Arkusz zasilania                                          |
| `schematy/project/CS-TB-48/Bezpieczenstwo.svg` | Arkusz bezpieczeństwa                                     |
| `schematy/project/CS-TB-48/Enable.svg`         | Arkusz enable (K2)                                        |
| `schematy/project/CS-TB-48/Naped.svg`          | Arkusz napędu                                             |
| `schematy/project/CS-TB-48/Zator.svg`          | Arkusz układu zatoru                                      |
| `schematy/project/CS-TB-48/polaczenia_*.md`    | Spisy połączeń per arkusz                                 |
| `schematy/project/CS-TB-48/polaczenia.md`      | Master netlista (referencja)                              |
| `schematy/project/CS-TB-48/projekt.json`       | Metadane projektu                                         |
| `build/build.ps1`                              | PDF DTR (pre-commit hook)                                 |

---

## 10. Metryki sukcesu

- Nowa **kreska** w symbolu WD: tylko linia w kolorze symbolu, bez kółka; czerwony punkt styku na końcu.
- Nowy **punkt** na E-01: tylko kółko zacisku (obrys jak symbol), 4 czerwone punkty styku na obwodzie.
- Snap i trasowanie łączą się z punktami styku (`data-part="contact"`), nie ze środkiem jointa.
- Punkt złącza: router wybiera styk automatycznie; użytkownik nie ustawia kierunku w UI.
- Netlista rozpoznaje wszystkie `[data-role="conn"][data-ref][data-pin]`.
- `npm test` / lint / format:check przechodzą w CI.
- Brak regresji wizualnej w E-00 po migracji (naprawione tagi joint, zsynchronizowane style CSS).

---

## 11. Roadmap / dług techniczny

| Priorytet | Element                                              | Status                                        |
| --------- | ---------------------------------------------------- | --------------------------------------------- |
| Wysoki    | Dalszy podział `main.js` (statusy → wording)         | W toku                                        |
| Średni    | Walidator spójności netlisty vs schemat              | Live `#netlistHealth`                         |
| Niski     | Rename pliku schematu na dysku (+ `polaczenia_*.md`) | Świadomie poza UI — lista zmienia tylko tytuł |
| Niski     | E-02 jako arkusz w tym samym edytorze                | Otwarte                                       |

**Zrealizowane (1.7):** belka `#selectionPropsGroup` (ref/pin/treść/symbol/długość/kierunek, bez `prompt()`); wyrównania; `#elemProps` RO; sanitize javascript:/data:; CI lint+format; testy history/draw/dirty.

**Zrealizowane (1.6):** ekstrakcja `draw-mode.js` + `createSidebarLists`; live validator netlisty; toolbar 2-liniowy.

**Zrealizowane (1.5):** badge zapisu/uprawnień; menu Więcej; modale confirm + toasty; empty states; overlay skrótów.

**Zrealizowane (1.4):** modal `#connMeta` przy tworzeniu złącza; ESM netlista/router; Vitest.

### Konwencja utrzymania PRD

- **PRD jest aktualizowany przy każdej zmianie zachowania edytora** (model domenowy, UX, wymagania FR).
- Wersja dokumentu (`1.x`) podbijana przy istotnych zmianach funkcjonalnych.

---

## 12. Słownik skrótów UI

| Przycisk | Tryb rysowania | `data-kind` |
| -------- | -------------- | ----------- |
| Kreska   | `lead`         | `lead`      |
| Punkt    | `point`        | `point`     |
| Węzeł    | `node`         | —           |
| Pin      | `pin`          | —           |
