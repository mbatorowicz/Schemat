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
    description: "Opis",
    description2: "Opis 2",
    elementNum: "Nr",
    pin: "Pin",
    text: "Tre\u015b\u0107",
    length: "D\u0142ugo\u015b\u0107",
    direction: "Kierunek",
    symbol: "Symbol",
    numberFrom: "Od",
    numberToggle: "Numeruj",
    sheetName: "Nazwa schematu",
    libraryName: "Nazwa pliku biblioteki",
    projectName: "Nazwa folderu projektu",
  },
  fieldTip: {
    symbolName: "Nazwa czytelna w listach. Edycja tylko w bibliotece \u2014 nie jest oznaczeniem na rysunku.",
    symbolDesignation:
      "Prefix typu elementu bez numeru (np. SB, K). Numer instancji nadawany jest na schemacie.",
    symbolDescription: "Pierwsza linia opisu katalogowego. Przy wstawianiu trafia na etykiet\u0119 pod symbolem.",
    symbolDescription2: "Druga linia opisu katalogowego pod pierwsz\u0105.",
    instancePrefix:
      "Prefix oznaczenia na schemacie (bez numeru). Przy zapisie do biblioteki numer nie jest przenoszony.",
    instanceNum: "Numer elementu na tym schemacie (lokalny). Nie trafia do biblioteki.",
    instanceDescription: "Pierwsza linia opisu przy symbolu. Lokalnie albo w bibliotece.",
    instanceDescription2: "Druga linia opisu przy symbolu. Lokalnie albo w bibliotece.",
    instanceRef:
      "Oznaczenie instancji na schemacie (np. K1). Musi by\u0107 unikalne w\u015br\u00f3d symboli na arkuszu. Enter zatwierdza, Esc cofa.",
    connPin: "Numer lub nazwa styku z\u0142\u0105cza. Enter zatwierdza, Esc cofa.",
    selectionText: "Tre\u015b\u0107 napisu. Enter zatwierdza, Esc cofa.",
    leadLength: "D\u0142ugo\u015b\u0107 kreski przy\u0142\u0105cza (min. krok siatki). Enter zatwierdza.",
    leadDir: "Kierunek zewn\u0119trzny kreski: N / E / S / W.",
    instanceSymbol: "Id symbolu z biblioteki dla zaznaczonej instancji <use>.",
    numberToggle: "Domy\u015blna numeracja przy wstawianiu instancji. Numer na schemacie to osobne pole.",
  },
  dialog: {
    newProject: "Nowy projekt",
    folderNotEmpty: "Folder niepusty",
    newLibrary: "Nowa biblioteka",
    openProject: "Otw\u00f3rz projekt",
    deleteSymbol: "Usu\u0144 symbol",
    newSheet: "Nowy schemat",
    promoteScope: "Zakres zmiany",
  },
  choice: {
    cancel: "Anuluj",
    local: "Tylko ten schemat",
    library: "Zaktualizuj bibliotek\u0119",
    promotePrefix:
      "Zmieniono oznaczenie (prefix). Zaktualizowa\u0107 szablon w bibliotece (bez numeru elementu), czy tylko t\u0119 instancj\u0119 na schemacie?",
    promoteDesc:
      "Zmieniono opis. Zaktualizowa\u0107 szablon w bibliotece, czy tylko t\u0119 instancj\u0119 na schemacie?",
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
    symbol: "Zapisz nazw\u0119, oznaczenie, opis i numeracj\u0119",
    sheet: "Zapisz nazw\u0119 wy\u015bwietlan\u0105 schematu",
    library: "Zmie\u0144 nazw\u0119 pliku biblioteki",
    projectRename: "Zmie\u0144 nazw\u0119 folderu projektu",
  },
  /** Pola formularza — puste; bez przyk\u0142ad\u00f3w ani domy\u015blnych nazw. */
  placeholder: {
    symbolName: "",
    designation: "",
    description: "",
    description2: "",
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
    instanceGroup: (ref, n) => `${ref} \u00b7 ${n} elem.`,
    instanceGroupKind: "Instancja",
    instanceGroupHint:
      "Zaznacz symbol, etykiet\u0119 i z\u0142\u0105cza razem (przesuwaj\u0105 si\u0119 wsp\u00f3lnie)",
  },
  align: {
    left: "Wyr\u00f3wnaj do lewej",
    centerH: "Wyr\u00f3wnaj do \u015brodka w poziomie",
    right: "Wyr\u00f3wnaj do prawej",
    top: "Wyr\u00f3wnaj do g\u00f3ry",
    centerV: "Wyr\u00f3wnaj do \u015brodka w pionie",
    bottom: "Wyr\u00f3wnaj do do\u0142u",
    needTwo: "Zaznacz co najmniej 2 obiekty do wyr\u00f3wnania.",
    done: (mode, n) => `Wyr\u00f3wnano (${n} jednostek).`,
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
  selectionText(text) {
    return `Tre\u015b\u0107: ${text}`;
  },
  instanceRefSet(ref) {
    return `Oznaczenie: ${ref}`;
  },
  instanceRefFailed: "Nie uda\u0142o si\u0119 zmieni\u0107 oznaczenia.",
  pinEmpty: "Pin nie mo\u017ce by\u0107 pusty.",
  refEmpty: "Oznaczenie nie mo\u017ce by\u0107 puste.",
  leadDirInvalid: "Kierunek musi by\u0107 N, E, S lub W.",
  connMeta(ref, pin) {
    return `Z\u0142\u0105cze ${ref}:${pin}`;
  },
  symbolMissing(id) {
    return `Brak symbolu ${id} w bibliotece.`;
  },
  symbolSwapped(id) {
    return `Podmieniono symbol na #${id}`;
  },
  editWithHandles: "Ten element edytujesz uchwytami (przeci\u0105gaj punkty).",
  undoEmpty: "Brak czego cofn\u0105\u0107.",
  undone: "Cofni\u0119to.",
  redone: "Ponowiono.",
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
    ...Object.values(W.align).filter((v) => typeof v === "string"),
    W.selection.pickSymbol,
    W.selection.newObjectStyle,
    ...Object.values(W.empty),
    ...Object.values(W.chrome),
    W.confirm.folderNotEmpty,
    W.confirm.dirtyLibrary,
    W.confirm.sheetNoProject,
    W.confirm.replaceManualRoute,
    ...Object.values(W.dialog),
    ...Object.values(W.choice),
    W.field.length,
    W.field.direction,
    W.field.symbol,
    W.fieldTip.leadLength,
    W.fieldTip.leadDir,
    W.fieldTip.instanceSymbol,
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
