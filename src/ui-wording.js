/** SSOT — etykiety, tooltips i statusy (bez przykładowych nazw projektu). */

export const BANNED_UI_TERMS = [
  "ID typu",
  "Zastosuj ID",
  "Ozn.",
  "typ symbolu",
  "Czujnik fotooptyczny",
  "Transporter boczny",
  "CS-TB",
  "Zasilanie",
  "E-01",
  "E-00_symbole",
  "np. B",
  "np. WD",
];

export const W = {
  field: {
    name: "Nazwa",
    designation: "Oznaczenie",
    pin: "Pin",
    numberFrom: "Od",
    numberToggle: "Numeruj",
    sheetName: "Nazwa schematu",
    libraryName: "Nazwa pliku biblioteki",
    projectName: "Nazwa folderu projektu",
  },
  fieldTip: {
    symbolName:
      "Nazwa czytelna w listach i nag\u0142\u00f3wku. Nie jest oznaczeniem instancji na rysunku.",
    symbolDesignation:
      "Typ elementu na schemacie. Wiele symboli w bibliotece mo\u017ce mie\u0107 to samo oznaczenie; numeracja instancji jest wsp\u00f3lna.",
    instanceRef:
      "Oznaczenie instancji na schemacie (np. K1). Musi by\u0107 unikalne w\u015br\u00f3d symboli na arkuszu.",
    connPin: "Numer lub nazwa styku z\u0142\u0105cza.",
    numberToggle:
      "Domy\u015blna numeracja przy wstawianiu instancji. Numer na schemacie to osobne pole.",
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
    unified: "Zapisz zmiany na dysk",
    unifiedProject: "Zapisz aktywny plik i ca\u0142y projekt (biblioteka, schematy, ustawienia)",
    file: "Zapisz zawarto\u015b\u0107 pliku na dysk",
    project: "Zapisz bibliotek\u0119, zmienione schematy i ustawienia projektu",
    symbol: "Zapisz oznaczenie i domy\u015bln\u0105 numeracj\u0119",
    sheet: "Zapisz nazw\u0119 wy\u015bwietlan\u0105 schematu",
    library: "Zmie\u0144 nazw\u0119 pliku biblioteki",
    projectRename: "Zmie\u0144 nazw\u0119 folderu projektu",
  },
  /** Pola formularza — puste; bez przyk\u0142ad\u00f3w ani domy\u015blnych nazw. */
  placeholder: {
    symbolName: "",
    designation: "",
    sheet: "",
    library: "",
    project: "",
    connRef: "",
    connPin: "",
    text: "",
    dateFormat: "RRRR-MM-DD",
  },
  selection: {
    pickSymbol: "Symbol",
    newObjectStyle: "Styl",
    pickSymbolTitle: "Wybierz symbol na liście po lewej",
    symbolTitle: (name) => (name ? `Symbol: ${name}` : "Symbol"),
  },
  create: {
    noFsApi: "Tworzenie projektu wymaga przegl\u0105darki z dost\u0119pem do folder\u00f3w (Chrome lub Edge).",
    noProjectWrite: "Brak uprawnie\u0144 zapisu \u2014 u\u017cyj \u201ePrzywr\u00f3\u0107 dost\u0119p\u201d.",
    projectFailed: "Nie uda\u0142o si\u0119 utworzy\u0107 projektu",
    libraryFailed: "Nie uda\u0142o si\u0119 utworzy\u0107 biblioteki",
    sheetFailed: "Nie uda\u0142o si\u0119 utworzy\u0107 schematu",
    libraryInProject: (rel) => `Utworzono bibliotek\u0119: ${rel}`,
    libraryLinked: (rel) => `Powi\u0105zano bibliotek\u0119: ${rel}`,
    libraryStandalone: (name) => `Utworzono bibliotek\u0119: ${name}`,
    sheetCreated: (title, file) => `Utworzono schemat: ${title} (${file})`,
  },
  list: {
    sheetFileHint: (file) => `Plik: ${file}`,
    insertSymbol: (ozn) => `Wstaw na schemat (${ozn})`,
    editSymbol: "Edytuj symbol",
    renameHint: "Podw\u00f3jne klikni\u0119cie lub F2 \u2014 zmie\u0144 nazw\u0119",
    renameAria: "Zmiana nazwy",
  },
  empty: {
    sheets: "Brak schematów — otwórz projekt lub utwórz schemat.",
    symbols: "Brak symboli — otwórz bibliotekę lub dodaj symbol.",
    elements: "Brak elementów na arkuszu.",
    openProjectCta: "Otwórz projekt",
  },
  confirm: {
    dirtyNewProject: (n) =>
      `Masz ${n} niezapisany(ych) schemat(ów). Utworzenie nowego projektu wyczyści bieżącą sesję. Kontynuować?`,
    folderNotEmpty: "Folder nie jest pusty. Utworzyć projekt w tym folderze? (istniejące pliki pozostaną)",
    dirtyLibrary: "Bieżąca biblioteka ma niezapisane zmiany. Utworzyć nową bibliotekę mimo to?",
    dirtyOpenProject: (n) =>
      `Masz ${n} niezapisany(ych) arkusz(y). Otwarcie projektu nadpisze je wersją z dysku. Kontynuować?`,
    deleteSymbol: (id) => `Usunąć symbol ${id} z biblioteki?`,
    sheetNoProject: "Brak otwartego projektu — schemat zostanie utworzony tylko w pamięci. Kontynuować?",
    replaceManualRoute: "Trasa jest ręczna. Zastąpić ją trasą automatyczną?",
  },
  toast: {
    saved: "Zapisano.",
    permRestored: "Przywrócono dostęp do dysku.",
    permDenied: "Brak zgody na dostęp do dysku.",
  },
  chrome: {
    open: "Otwórz",
    save: "Zapisz",
    route: "Trasuj",
    more: "Więcej",
    shortcuts: "Skróty",
  },
};

export function saveActionTip({ hasDir, fileName }) {
  if (hasDir) return W.saveTip.unifiedProject;
  const base = W.saveTip.unified;
  return fileName ? `${base} (${fileName})` : base;
}

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

export function resourceNamePlaceholder(_mode) {
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
  if (ozn && ozn !== name) return `${name} · ${ozn}`;
  return name;
}

export const status = {
  symbolSaved(name, ozn) {
    const oznPart = ozn && ozn !== name ? ` \u00b7 ${W.field.designation.toLowerCase()}: ${ozn}` : "";
    return `Zapisano symbol: ${name}${oznPart}`;
  },
  symbolRenamed(from, to) {
    return `Nazwa symbolu: ${from} \u2192 ${to}`;
  },
  symbolEmptyName: "Nazwa symbolu nie mo\u017ce by\u0107 pusta.",
  symbolInvalidName: "Nazwa symbolu nie mo\u017ce by\u0107 pusta (maks. 120 znak\u00f3w).",
  symbolEmptyDesignation: "Oznaczenie nie mo\u017ce by\u0107 puste.",
  symbolInvalidDesignation: "Oznaczenie: litery, cyfry, _, - (bez spacji).",
  symbolDuplicateDesignation: (ozn) => `Symbol o oznaczeniu ${ozn} ju\u017c istnieje.`,
  symbolDuplicate: (name) => `Symbol o nazwie ${name} ju\u017c istnieje.`,
  symbolPickLibrary: "Wybierz symbol w bibliotece.",
  sheetRenamed(from, to) {
    return `Schemat: ${from} \u2192 ${to}`;
  },
  libraryRenamed(from, to) {
    return `Biblioteka: ${from} \u2192 ${to}`;
  },
  projectRenamed(from, to) {
    return `Projekt: ${from} \u2192 ${to}`;
  },
  projectRenameFailed:
    "Nie uda\u0142o si\u0119 zmieni\u0107 nazwy folderu \u2014 zmie\u0144 r\u0119cznie i otw\u00f3rz projekt ponownie.",
  resourceEmpty: "Pole nie mo\u017ce by\u0107 puste.",
  resourceInvalidSheet: "Nieprawid\u0142owa nazwa pliku schematu.",
  sheetTitleInvalid: "Nazwa schematu nie mo\u017ce by\u0107 pusta (maks. 120 znak\u00f3w).",
  sheetTitleMissingNode: "Brak grupy schematu w pliku SVG.",
  sheetTitleSaved(title) {
    return `Zapisano nazw\u0119 schematu: ${title}`;
  },
  resourceInvalidLibrary: "Nazwa biblioteki musi ko\u0144czy\u0107 si\u0119 na .svg.",
  resourceInvalidProject: "Nazwa projektu nie mo\u017ce zawiera\u0107 \\ ani /.",
  pickSheet: "Wybierz schemat na li\u015bcie po lewej.",
};

export function emptyListCopy(kind) {
  if (kind === "sheets") return W.empty.sheets;
  if (kind === "symbols") return W.empty.symbols;
  if (kind === "elements") return W.empty.elements;
  return "";
}

/** Zbierz wszystkie statyczne stringi UI do testu regresji wordingu. */
export function collectWordingStrings() {
  const out = [
    ...Object.values(W.field),
    ...Object.values(W.group),
    ...Object.values(W.save),
    ...Object.values(W.saveTip),
    ...Object.values(W.fieldTip),
    ...Object.values(W.placeholder).filter((s) => s !== "RRRR-MM-DD"),
    ...Object.values(W.list),
    W.selection.pickSymbol,
    W.selection.newObjectStyle,
    ...Object.values(W.empty),
    ...Object.values(W.chrome),
    W.confirm.folderNotEmpty,
    W.confirm.dirtyLibrary,
    W.confirm.sheetNoProject,
    W.confirm.replaceManualRoute,
    status.symbolEmptyName,
    status.symbolInvalidName,
    status.symbolEmptyDesignation,
    status.symbolInvalidDesignation,
    status.symbolPickLibrary,
    status.projectRenameFailed,
    status.resourceEmpty,
    status.resourceInvalidSheet,
    status.sheetTitleInvalid,
    status.sheetTitleMissingNode,
    status.resourceInvalidLibrary,
    status.resourceInvalidProject,
    status.pickSheet,
    W.list.renameHint,
    W.list.renameAria,
  ];
  return out;
}
