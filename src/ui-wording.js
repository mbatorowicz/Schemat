/** SSOT — etykiety, tooltips, statusy i breadcrumb (nazwy, zapis, zasoby). */

export const BANNED_UI_TERMS = [
  "ID typu",
  "Zastosuj ID",
  "Ozn.",
  "typ symbolu",
];

export const W = {
  field: {
    name: "Nazwa",
    designation: "Oznaczenie",
    numberFrom: "Od",
    numberToggle: "Numeruj",
    sheetName: "Nazwa schematu",
    libraryName: "Nazwa biblioteki",
    projectName: "Nazwa projektu",
  },
  fieldTip: {
    symbolName:
      "Nazwa czytelna w listach i nag\u0142\u00f3wku (np. Czujnik fotooptyczny). Nie trafia na schemat jako oznaczenie elementu.",
    symbolDesignation:
      "Typ elementu na schemacie (np. B, SK, SB). Wiele symboli w bibliotece mo\u017ce mie\u0107 to samo oznaczenie \u2014 numeracja SB1, SB2\u2026 jest wsp\u00f3lna.",
    numberToggle:
      "Domy\u015blna numeracja instancji przy wstawianiu na schemat (B1, B2\u2026). Numer na schemacie to osobne pole data-ref.",
  },
  group: {
    symbol: "Symbol",
    sheet: "Schemat",
    library: "Biblioteka",
    project: "Projekt",
    selection: "Zaznaczenie",
  },
  save: {
    params: "Zapisz",
    project: "Zapisz projekt",
    fileLib: "Zapisz bibliotek\u0119",
    fileSheet: "Zapisz schemat",
    fileGeneric: "Zapisz",
  },
  saveTip: {
    file: "Zapisz zawarto\u015b\u0107 pliku na dysk",
    project: "Zapisz bibliotek\u0119, zmienione schematy i projekt.json",
    symbol: "Zapisz nazw\u0119, oznaczenie (id techniczne) i domy\u015bln\u0105 numeracj\u0119 na schemacie",
    sheet: "Zmie\u0144 nazw\u0119 pliku schematu",
    library: "Zmie\u0144 nazw\u0119 pliku biblioteki",
    projectRename: "Zmie\u0144 nazw\u0119 folderu projektu",
  },
  placeholder: {
    symbolName: "Czujnik fotooptyczny",
    designation: "B",
    sheet: "E-01",
    library: "E-00_symbole.svg",
    project: "CS-TB-48",
  },
  selection: {
    pickSymbol: "Wybierz symbol",
    newObjectStyle: "Styl nowych obiekt\u00f3w",
    pickSymbolTitle: "Wybierz symbol na li\u015bcie po lewej",
    symbolTitle: (name) => `Symbol w bibliotece: ${name}`,
  },
};

export function saveFileLabel({ onLib, onSheet }) {
  if (onLib) return W.save.fileLib;
  if (onSheet) return W.save.fileSheet;
  return W.save.fileGeneric;
}

export function saveFileTip({ onLib, onSheet, fileName }) {
  const base = W.saveTip.file;
  return fileName ? `${base} (${fileName})` : base;
}

export function resourceNameLabel(mode) {
  if (mode === "sheet") return W.field.sheetName;
  if (mode === "library") return W.field.libraryName;
  if (mode === "project") return W.field.projectName;
  return "";
}

export function resourceNamePlaceholder(mode) {
  if (mode === "sheet") return W.placeholder.sheet;
  if (mode === "library") return W.placeholder.library;
  if (mode === "project") return W.placeholder.project;
  return "";
}

export function paramsSaveTip(mode) {
  if (mode === "sheet") return W.saveTip.sheet;
  if (mode === "library") return W.saveTip.library;
  if (mode === "project") return W.saveTip.projectRename;
  return W.saveTip.symbol;
}

export function symbolSelectionSummary(name, oznLabel) {
  if (!name) return W.selection.pickSymbol;
  const ozn = (oznLabel || "").trim();
  const oznPart = ozn && ozn !== name ? ` \u00b7 ozn. ${ozn}` : "";
  return `${W.group.symbol}: ${name}${oznPart}`;
}

export function breadcrumbProject(name) {
  return name ? `Projekt: ${name}` : "";
}

export function breadcrumbLibrary(selName) {
  return selName ? `Biblioteka \u00b7 ${selName}` : "Biblioteka";
}

export function breadcrumbSheet(name) {
  return name ? `Schemat: ${name}` : "Schemat";
}

export const status = {
  symbolSaved(name, ozn) {
    const oznPart = ozn && ozn !== name ? ` \u00b7 ozn. ${ozn}` : "";
    return `Zapisano symbol: ${name}${oznPart}`;
  },
  symbolRenamed(from, to) {
    return `Nazwa symbolu: ${from} \u2192 ${to}`;
  },
  symbolEmptyName: "Nazwa symbolu nie mo\u017ce by\u0107 pusta.",
  symbolInvalidName: "Nazwa symbolu nie mo\u017ce by\u0107 pusta (max. 120 znak\u00f3w).",
  symbolEmptyDesignation: "Oznaczenie nie mo\u017ce by\u0107 puste.",
  symbolInvalidDesignation: "Oznaczenie: litery (w tym polskie), cyfry, _, - (np. B, SK, SB).",
  symbolDuplicateDesignation: (ozn) => `Symbol o oznaczeniu ${ozn} ju\u017c istnieje.`,
  symbolDuplicate: (name) => `Symbol o nazwie ${name} ju\u017c istnieje.`,
  symbolPickLibrary: "Wybierz symbol w bibliotece (lewy panel).",
  sheetRenamed(from, to) {
    return `Schemat: ${from} \u2192 ${to}`;
  },
  libraryRenamed(from, to) {
    return `Biblioteka: ${from} \u2192 ${to}`;
  },
  projectRenamed(from, to) {
    return `Projekt: ${from} \u2192 ${to}`;
  },
  projectRenameFailed: "Nie uda\u0142o si\u0119 zmieni\u0107 nazwy folderu \u2014 zmie\u0144 r\u0119cznie w eksploratorze i otw\u00f3rz projekt ponownie.",
  resourceEmpty: "Nazwa nie mo\u017ce by\u0107 pusta.",
  resourceInvalidSheet: "Nazwa schematu: litery, cyfry, _, - (bez .svg).",
  resourceInvalidLibrary: "Nazwa biblioteki musi ko\u0144czy\u0107 si\u0119 na .svg.",
  resourceInvalidProject: "Nazwa projektu nie mo\u017ce zawiera\u0107 \\ ani /.",
};

/** Zbierz wszystkie statyczne stringi do testu regresji wordingu. */
export function collectWordingStrings() {
  const out = [
    ...Object.values(W.field),
    ...Object.values(W.group),
    ...Object.values(W.save),
    ...Object.values(W.saveTip),
    ...Object.values(W.placeholder),
    W.selection.pickSymbol,
    W.selection.newObjectStyle,
    status.symbolEmptyName,
    status.symbolInvalidName,
    status.symbolEmptyDesignation,
    status.symbolInvalidDesignation,
    status.symbolPickLibrary,
    status.projectRenameFailed,
    status.resourceEmpty,
    status.resourceInvalidSheet,
    status.resourceInvalidLibrary,
    status.resourceInvalidProject,
  ];
  return out;
}
