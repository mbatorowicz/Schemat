# Architektura edytora SVG

## Zasada: jedno źródło prawdy (SSOT)

Każdy obszar ma **jeden moduł** — reszta tylko importuje. Nie duplikuj logiki w `main.js`.

| Obszar | Moduł SSOT | Odpowiedzialność |
|--------|------------|------------------|
| Symbole, href | `symbol-service.js` | `parseUseHref`, `resolveSymbolDef`, `definitionForUseElement`, `auditSymbolsOnSheet`, migracja refs |
| Defs podglądu/zapisu | `defs-assembler.js` | `useColorAwareClone`, `assembleEditDefs`, aliasy id |
| Mapowanie DOM | `dom-pairing.js` | `childPair`, `forEachPaired` — src ↔ klon |
| Render | `render-pipeline.js` | `rebuildEditDefs`, `rebuildHost`, `bboxInRoot` |
| Scena DOM | `stage-layers.js` | `createStageLayers`, gettery `host`/`sel`/…, `hostRootFrom` |
| Boot | `app-bootstrap.js` | kolejność init + `wireSceneDependentModules` |
| Migracje | `project-migrate.js` | `migrateProject()` — jedna kolejność |
| Typografia | `element-styles.js` | `applyTextStyle` — bez nadpisywania bez `force` |
| Złącza | `conn-model.js` + `conn-theme.js` | geometria vs etykieta (`touchLabel`) |
| Zapis arkusza | `sheet-persistence.js` | `dirty`, `inlineSheetDefsSafe` |
| Formularze toolbara | `toolbar-form.css` + `toolbar-context.js` | layout pól nazw, widoczność grup |
| Wording UI | `ui-wording.js` | etykiety, tooltips, statusy, breadcrumb |

## Przepływ symboli (nie psuj tego łańcucha)

```
Plik SVG (defs osadzone)
        ↓ wczytanie
state.srcSvg + state.lib.svg
        ↓ migrateProject()
sync href, usuń duplikaty defs, aliasy id
        ↓ render()
assembleEditDefs(editDefs)  ← bibl. + fallback arkusz + alias SK1/NO→SK
        ↓
<use href="#SK"> widzi definicję w editDefs na scenie
        ↓ zapis
inlineSheetDefsSafe()     ← osadza używane symbole z biblioteki
```

**Reguły:**
- Podgląd: zawsze `assembleEditDefs` — nigdy ręczne klonowanie symboli w `main.js`
- Snap/netlista: zawsze `definitionForUseElement(use, lib, sheetSvg)`
- Zapis: zawsze `useColorAwareClone` z `defs-assembler.js`
- Mapowanie: zawsze `childPair(node, el, hostRoot)` — nigdy `indexOf` inline

## Inicjalizacja

```
wireHistory() / wireConnModel() / wireProjectMigrate() / wireRenderPipeline()
scene.build() + drawGrid()          ← stage-layers.js (gettery host/sel/…)
wireNetlistRouting() / wireSelectionModel()   ← getHost: () => scene.host
```

Moduły zależne od klonu podglądu **nigdy** nie dostają surowego `gHost` z momentu wire — tylko `getHost()`.
Kolejność wymuszona przez `app-bootstrap.js`. Przycisk **Trasuj** (`btnRouteConn`) podpinany przez `getRouteSelectedConnection()` **po** `wireNetlistRouting()`.

## Testy regresji (uruchamiaj po każdej większej zmianie)

```bash
cd Schemat && npm test
```

Kluczowe scenariusze ręczne:
1. Otwórz CS-TB-48 → arkusze Zasilanie/Bezpieczenstwo/Enable/Naped/Zator; symbole G1, F1, SK1, Q widoczne na Zasilaniu
2. Przełącz arkusz → netlista `polaczenia_<arkusz>.md` ładuje się automatycznie
3. Przycisk **Trasuj** — trasuje wybrane połączenie (nie `undefined` onclick)
4. Zmień font etykiety złącza → Zapisz → F5 → font zostaje
5. Zapisz arkusz → otwórz SVG w przeglądarce → symbole w `<defs>`
6. Przeciąganie elementów myszką działa po init sceny

## Dług technologiczny — co zostało

- [x] `element-factory.js` — tworzenie elementów (mkText, mkChrome, mkHandle, mkPrev)
- [x] Wydzielenie UI netlisty do `netlist-ui.js`
- [x] Wydzielenie zapisu plików do `file-io.js`
- [ ] jsdom w testach dla `assembleEditDefs`
- [ ] Normalizacja zapisu: mniej inline, więcej klas CSS
