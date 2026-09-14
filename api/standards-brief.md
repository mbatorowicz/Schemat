# Skrót roboczy — normy schematów maszyn (nie zastępuje oficjalnego tekstu)

Ten brief jest **skrótem konwencji projektowych** edytora. Pełne teksty EN/IEC są chronione prawem autorskim — nie wklejaj PDF-ów. Przy spornych wymaganiach użyj narzędzia `lookupPublicGuidance` i **cytuj URL**. Gdy brak źródła, napisz wprost, że treść jest niepewna.

## Projekt i konwencja E-00

- Norma projektu (pole `norm`): zwykle **EN 60204-1** (wyposażenie elektryczne maszyn).
- Symbole graficzne: rodzina **IEC/EN 60617** (w praktyce biblioteka `E-00`).
- Oznaczenia literowe aparatów: **EN 81346-2** (IEC 81346-2).
- Nie wymyślaj symboli spoza `symbolCatalog`. `insert_symbol.symbolId` musi być `id` z katalogu.

### Prefiksy E-00 / 81346 (typowe)

| Prefiks | Znaczenie                                        | Przykłady id w bibliotece |
| ------- | ------------------------------------------------ | ------------------------- |
| G       | Zasilacz / generator                             | PSU, G1                   |
| F       | Zabezpieczenie                                   | F1                        |
| Q       | Rozłącznik / wyłącznik mocy                      | Q                         |
| WD      | Wyłącznik różnicowoprądowy / przyłącze zasilania | WD                        |
| SK / K  | Stycznik / przekaźnik                            | SK, SK1, NO               |
| T       | Transformator / falownik                         | T                         |
| M       | Silnik                                           | M                         |
| X       | Listwa zaciskowa                                 | X-3, X-4                  |
| SB / S  | Przycisk                                         | SB                        |
| H       | Sygnalizacja                                     | —                         |
| W       | Przewód / szyna (rzadko jako symbol)             | —                         |

Instancja na arkuszu: `WD1`, `G1`, `X1` — `data-ref` + `data-sym` = id z biblioteki.

## EN 60204-1 — rysunek (praktyka w tym edytorze)

- Arkusz A4, ramka i tabelka dokumentu; pasy: szyny zasilania u góry, sterowanie, napęd, listwy X z prawej (`sheet-lanes`).
- Przewody: **L / N / PE** (sieć), **+24V / 0V** (obwody sterowania), STO / E-stop jako obwód bezpieczeństwa — nie mieszać PE z N.
- PE musi być ciągły i jednoznacznie oznaczony; nie „uziemiać” przez przypadkowy węzeł bez wpisu w spisie.
- Spis połączeń jest SSOT (`sheetConnections`): `from`/`to` w formie `REF:PIN` (np. `WD1:L`, `X1:3`).
- Trasowanie: linie ortogonalne między **punktami styku** złączy (nie środek kółka).
- Złącze **point** = zacisk na schemacie (kółko); **lead** = kreska przyłącza w symbolu.

## IEC/EN 60617 — kategorie (orientacyjnie)

- Styki zwierne/rozwierne, cewki, silniki, transformatory, bezpieczniki, lampki, złącza.
- Symbol na rysunku musi odpowiadać funkcji w spisie (np. stycznik SK ≠ wyłącznik Q).
- Nie zamieniaj symbolu tylko dlatego, że „wygląda podobnie” — sprawdź `data-sym` i katalog.

## Spójność, którą masz pilnować

1. Każde `REF` ze spisu istnieje na arkuszu (albo zaproponuj `insert_symbol`).
2. Każde `REF:PIN` ma złącze (`conn`) o tym `data-ref` + `data-pin`.
3. `net` (L/N/PE/+24V…) jest zgodny z rolą pinu (L nie na PE).
4. Brak symboli spoza biblioteki (`missingSymbols`).
5. Oznaczenia zgodne z 81346 / E-00 (nie „PSU1” gdy konwencja to G1 — chyba że tak jest w katalogu).
6. Nie proponuj obliczeń prądów ani doboru przekroju (poza zakresem edytora).

## Propozycje edycji

Zwracaj karty przez narzędzie `proposeEdits`. Typy: `insert_symbol`, `add_connection`, `update_connection`, `route_connection`, `set_label`, `highlight`. Użytkownik musi je zaakceptować — nie twierdź, że już zmieniono rysunek.
