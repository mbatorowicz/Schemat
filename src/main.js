import { connAllCss, syncConnStylesInLib } from "./conn-theme.js";
import { createConnModel } from "./conn-model.js";
import { walkDir, getFileHandleByPath, resolveSharedLibrary, normalizeRelPath } from "./project-files.js";
import {
  sheetElementListLabel,
  instanceRefOf,
  collectInstanceMembers,
  expandToInstanceMembers,
} from "./sheet-elements.js";
import { buildAlignUnits, resolveAlignElements, unionBox, computeAlignDeltas } from "./selection-align.js";
import { flipPoint, flipAngleDeg, normalizeAngleDeg, collectFlipTargets } from "./selection-flip.js";
import {
  readUseOrient,
  writeUseOrient,
  composeSheetFlip,
} from "./instance-orient.js";
import {
  syncInstanceLabelAngles,
  syncAllInstanceLabelAngles,
  syncInstancePinLabels,
  markSheetPinLabelManual,
  isSheetPinLabel,
  instanceRefsFromElements,
  isInstanceOwnedText,
  findUseByRef,
} from "./instance-labels.js";
import { wireColor, wireCssRules } from "./wire-theme.js";
import { NetlistModel } from "./netlist-model.js";
import { wireConnId, isWireGeometry, findWireByConnId } from "./wire-geometry.js";
import {
  clearWireConnHighlight,
  authoredStrokeWidth,
  authoredStrokeColor,
  appendWireStrokeOverlay,
} from "./wire-highlight.js";
import {
  removeWireMarksForWire,
  syncWireMarks,
  resyncAllWireMarks,
  normalizeWireMarkMode,
  DEFAULT_WIRE_MARK_MODE,
} from "./wire-markers.js";
import { rePinWireEndsFromMeta } from "./wire-ends.js";
import { endpointRawFromSnap } from "./topo-nodes.js";
import { createConnectionApply } from "./connection-apply.js";
import { initRouteOptsUi as bindRouteOptsUi } from "./route-opts-ui.js";
import { num, fmt, fmtRot, parseSvg, serializeSvg, firstSchId } from "./svg-utils.js";
import {
  refBaseForSymbol as refBaseForSymbolCore,
  isValidInstanceRef,
  splitInstanceRef,
  joinInstanceRef,
} from "./instance-refs.js";
import { createHistory } from "./history.js";
import { resolveLibSymbol, resolveSheetSymbol, resolveSymbol, collectUsedSymbolIds } from "./symbol-resolver.js";
import {
  markSheetDirty,
  countDirtySheets,
  inlineSheetDefsSafe,
  sheetKey,
  findSheetByKey,
} from "./sheet-persistence.js";
import {
  readFontSizePx,
  applyTextStyle,
  applyPrimaryColor,
  applyStrokeWidth,
  applyStrokeDash,
  applyFill,
  applyFont,
} from "./element-styles.js";
import { resolveStyleTargetsForRecords, primaryColorFromRecord } from "./style-targets.js";
import { SVGNS, XLINK } from "./svg-constants.js";
import {
  mkEl,
  parsePoints,
  parsePathAbs,
  buildD,
  simpleRotation,
  rotatePoint,
  rectCorner,
  setRectCorner,
} from "./svg-dom.js";
import { createRenderPipeline } from "./render-pipeline.js";
import { useColorAwareClone } from "./defs-assembler.js";
import { definitionForUseElement, setUseHref, syncUseSymbolHrefs } from "./symbol-service.js";
import { createProjectMigrator } from "./project-migrate.js";
import { createNetlistRouting } from "./netlist-routing.js";
import { createSelectionModel, paintVisible } from "./selection-model.js";
import { createStageLayers } from "./stage-layers.js";
import { bootstrapEditorSync } from "./app-bootstrap.js";
import {
  hasLibSymbols,
  rewriteSymbolIdRefs,
  normalizeLibLayout,
  stripSymPrefixInSvg,
  prepareLibrarySvg,
  findLibraryInProject,
  createLibraryRecord,
} from "./library-loader.js";
import {
  idbSet,
  idbGet,
  writeJsonCache,
  restoreLibrarySnapshot,
  restoreProjectSnapshot,
  restorePrefsSnapshot,
} from "./persistence.js";
import { qsById, qsaByOwnerRef } from "./dom-selectors.js";
import { mkHandle, mkPrev } from "./element-factory.js";
import { createNetlistUi, createNetlistLiveValidator } from "./netlist-ui.js";
import { createFileIo } from "./file-io.js";
import {
  resolveBootCachePlan,
  resolveReloadSheetsOutcome,
  resolveBootActiveTarget,
  prefsSheetKey,
  projectCacheScore,
  libraryCacheScore,
  shouldWriteLibraryCache,
} from "./boot-cache.js";
import { emptySvgMarkup, uniqueLibraryFileName, uniqueFileName } from "./document-scaffold.js";
import {
  createSheetDocument,
  createLibraryInProject,
  createLibraryStandalone,
  initializeNewProjectOnDisk,
  isDirectoryEmpty,
  writeSheetToProject,
  parseEmptyLibrary,
} from "./project-create.js";
import {
  existingLibrarySvgNames,
  sheetRelPathSet,
  librarySettingPathForHandle,
  DEFAULT_WALK_DEPTH,
} from "./project-paths.js";
import { resolveToolbarGroups } from "./toolbar-context.js";
import {
  resolveSelectionPropsMode,
  readSelectionPropsState,
  selectionPropsFocusField,
  selectionInstanceUse,
  leadPropsFromConn,
} from "./selection-props.js";
import { selectionPropsEls } from "./selection-props-ui.js";
import { applyConnectionFieldLabels, setConnectionPropsVisible } from "./connection-fields.js";
import {
  W,
  saveFileLabel,
  saveFileTip,
  saveActionTip,
  resourceNameLabel,
  resourceNamePlaceholder,
  paramsSaveTip,
  symbolSelectionSummary,
  status,
} from "./ui-wording.js";
import {
  applySymbolForm,
  applySymbolDisplayName,
  readSymbolFormFromDom,
  symbolDisplayName,
  symbolDescription,
  symbolDescription2,
  symbolCatalogLabel,
  symbolDesignation,
  SYMBOL_DESC_ATTR,
  SYMBOL_DESC2_ATTR,
} from "./symbol-save.js";
import { sheetDisplayTitle, sheetCatalogLabel, applySheetDisplayTitle } from "./sheet-catalog.js";
import { renameLibraryOnDisk, renameProjectFolderOnDisk } from "./resource-rename.js";
import {
  createConfirmDialog,
  createChoiceDialog,
  createToastHost,
  bindModalA11y,
  createAskTextDialog,
} from "./ui-dialog.js";
import { createSavePermBadge } from "./project-perm-ui.js";
import { createSidebarLists } from "./sidebar-lists.js";
import { createDrawBannerSync } from "./draw-mode-ui.js";
import { createDrawMode } from "./draw-mode.js";
import { bindShortcutsHelp } from "./shortcuts-help.js";
import { summarizeNetlistHealth } from "./netlist-validate.js";
import { resolveBootStatusMessage } from "./project-boot.js";
import {
  pointsOfWire,
  hitWireSegment,
  insertVertex,
  removeBreakVertex,
  canRemoveBreakVertex,
  applyWirePoints,
} from "./polyline-edit.js";
import "./toolbar-form.css";

("use strict");

// ---- ikony belki narzędzi (inline SVG, viewBox 0 0 24 24) ----
const ICONS = {
  btnOpen: '<path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  btnMenuOpen: '<path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  btnNewProject: '<path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
  btnGrant:
    '<path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="15" cy="14" r="2.2"/><path d="M15 16v3M15 19h2"/>',
  btnSave: '<path d="M4 4h11l5 5v11H4z"/><path d="M8 4v5h7"/><rect x="8" y="13" width="8" height="7"/>',
  btnMenuSave: '<path d="M4 4h11l5 5v11H4z"/><path d="M8 4v5h7"/><rect x="8" y="13" width="8" height="7"/>',
  btnSaveAs: '<path d="M4 4h10l4 4v5"/><path d="M8 4v5h7"/><path d="M13.5 20.5l6-6 2 2-6 6h-2z"/>',
  btnNewSheet:
    '<rect x="4" y="3" width="16" height="18" rx="1"/><rect x="7" y="15" width="10" height="4"/><path d="M7 7h10"/>',
  btnNewLibrary:
    '<path d="M4 5a2 2 0 0 1 2-2h4v16H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-4v16h4a2 2 0 0 1 2 2z"/><path d="M12 8v8M9 11h6"/>',
  btnLib: '<path d="M4 5a2 2 0 0 1 2-2h4v16H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-4v16h4a2 2 0 0 1 2 2z"/>',
  btnSettings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19"/>',
  btnUndo: '<path d="M9 8L4 12l5 4"/><path d="M4 12h10a6 6 0 0 1 0 8"/>',
  btnRedo: '<path d="M15 8l5 4-5 4"/><path d="M20 12H10a6 6 0 0 0 0 8"/>',
  btnCopy:
    '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  btnCut: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5L20 17M8 15.5L20 7"/>',
  btnPaste: '<rect x="5" y="5" width="14" height="16" rx="1.5"/><path d="M9 5V3.5h6V5"/><path d="M8 12h8M8 16h5"/>',
  btnClone: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  btnAddLine:
    '<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.6" class="fillnode"/><circle cx="19" cy="5" r="1.6" class="fillnode"/>',
  btnAddRect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  btnAddCircle: '<circle cx="12" cy="12" r="8"/>',
  btnAddArc: '<path d="M4 17a8 8 0 0 1 16 0"/>',
  btnAddText: '<path d="M6 6h12M12 6v13M9 19h6"/>',
  btnAddPoint: '<circle cx="12" cy="12" r="5"/>',
  btnAddNode: '<circle cx="12" cy="12" r="5" class="fillnode"/>',
  btnAddLead: '<path d="M4 12h16"/>',
  btnAlignLeft: '<path d="M4 4v16"/><path d="M8 7h8v3H8z"/><path d="M8 14h12v3H8z"/>',
  btnAlignCenterH: '<path d="M12 4v16"/><path d="M8 7h8v3H8z"/><path d="M6 14h12v3H6z"/>',
  btnAlignRight: '<path d="M20 4v16"/><path d="M8 7h8v3H8z"/><path d="M4 14h12v3H4z"/>',
  btnAlignTop: '<path d="M4 4h16"/><path d="M7 8h3v8H7z"/><path d="M14 8h3v12h-3z"/>',
  btnAlignCenterV: '<path d="M4 12h16"/><path d="M7 6h3v12H7z"/><path d="M14 8h3v8h-3z"/>',
  btnAlignBottom: '<path d="M4 20h16"/><path d="M7 8h3v8H7z"/><path d="M14 4h3v12h-3z"/>',
  btnFlipH:
    '<path d="M12 3v18"/><path d="M9 7L4 12l5 5z" class="fillnode"/><path d="M15 7l5 5-5 5z" class="fillnode"/>',
  btnFlipV: '<path d="M3 12h18"/><path d="M7 9l5-5 5 5z" class="fillnode"/><path d="M7 15l5 5 5-5z" class="fillnode"/>',
  btnRotL: '<path d="M5 12a7 7 0 1 0 2-4.9"/><path d="M4 4v4h4"/>',
  btnRotR: '<path d="M19 12a7 7 0 1 1-2-4.9"/><path d="M20 4v4h-4"/>',
  btnDelShape: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  btnSaveSymbol: '<path d="M20 6L9 17l-5-5"/>',
  btnSaveResource: '<path d="M20 6L9 17l-5-5"/>',
  btnAddSym: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
  btnDupSym: '<path d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M4 12l8 4.5 8-4.5"/>',
  btnExportSym: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M4 19h16"/>',
  btnDelSym: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  btnZoomOut: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.5-4.5M8 11h6"/>',
  btnZoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.5-4.5M8 11h6M11 8v6"/>',
  btnFit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
};
function injectIcons() {
  const svgFor = (id) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[id] + "</svg>";
  for (const id in ICONS) {
    const b = document.getElementById(id);
    if (!b) continue;
    const ico = b.querySelector(".btn-ico");
    if (ico) ico.innerHTML = svgFor(id);
    else if (b.classList.contains("btn-labeled") || b.classList.contains("file-menu-item")) {
      const span = document.createElement("span");
      span.className = "btn-ico";
      span.setAttribute("aria-hidden", "true");
      span.innerHTML = svgFor(id);
      b.insertBefore(span, b.firstChild);
    } else b.innerHTML = svgFor(id);
  }
}

// ---- stan ----
const state = {
  srcDoc: null,
  srcSvg: null,
  fileHandle: null,
  fileName: "schemat.svg",
  dir: null, // uchwyt folderu projektu
  libHandle: null, // uchwyt wspólnego pliku biblioteki (globalny)
  lib: null, // biblioteka: {handle,name,svg,doc}
  sheets: [], // schematy (pliki): [{handle,name,svg,doc,id}]
  active: null, // aktywny cel: state.lib lub obiekt z state.sheets
  lastSheet: null, // ostatni aktywny arkusz (cel wstawiania z listy symboli)
  symbols: [],
  connIssues: [],
  selId: null, // symbols = symbole biblioteki [{id,node}]
  zoom: 3,
  panX: 120,
  panY: 120,
  snap: true,
  step: 5,
  showHandles: true,
  rotateOwnedLabels: true,
  handles: [],
  selHandle: null,
  activeEl: null,
  selection: [],
  strokeW: 2,
  strokeColor: "#0f172a",
  fillColor: "#ffd21a",
  fillOn: false,
  dashOn: false,
  fontSize: 9,
  fontWeight: 400,
  pathSegs: new Map(), // el -> segs
  clipboard: [], // sklonowane elementy (schowek wewnętrzny)
  netlist: null,
  netlistRaw: null,
  netlistHandle: null,
  netlistProposals: [],
  selectedConnId: "",
  projectNetlists: [],
  routeOpts: { strokeWidth: "" },
  wireMarkMode: DEFAULT_WIRE_MARK_MODE,
  drawMode: null, // "line" gdy rysujemy łamaną
  drawing: null, // {pts:[[x,y]...], cursor:[x,y]}
  breakEditMode: false, // klik na trasę = dodaj punkt łamania
  undo: [],
  redo: [],
  connLabelSel: null, // <g data-role="conn"> gdy edytowany jest tylko napis pinu
};

// ---- elementy DOM ----
const stage = document.getElementById("stage");
const symlist = document.getElementById("symlist");
const schlist = document.getElementById("schlist");
const elemList = document.getElementById("elemList");
const elemSec = document.getElementById("elemSec");
const elemProps = document.getElementById("elemProps");
const elemPropsTitle = document.getElementById("elemPropsTitle");
const elemPropsBody = document.getElementById("elemPropsBody");
const statusEl = document.getElementById("status");
const drawBannerEl = document.getElementById("drawBanner");
const toolbarEl = document.getElementById("toolbar");
const hud = document.getElementById("hud");
const schEmpty = document.getElementById("schEmpty");
const symEmpty = document.getElementById("symEmpty");
const elemEmpty = document.getElementById("elemEmpty");

const confirmDialog = createConfirmDialog();
confirmDialog.init();
const choiceDialog = createChoiceDialog();
choiceDialog.init();
const askTextDialog = createAskTextDialog();
askTextDialog.init();
const toastHost = createToastHost();
const askConfirm = (message, cfg) => confirmDialog.ask(message, cfg);
const askChoice = (message, cfg) => choiceDialog.ask(message, cfg);
const askText = (title, cfg) => askTextDialog.ask(title, cfg);
let savePermBadge = null;
let syncDrawBanner = () => {};
let settingsModal = null;

// warstwy sceny (gettery — bezpieczne dla modułów wire po build)
let scene;

function clearHighlight() {
  if (scene?.sel) scene.sel.innerHTML = "";
}

/** Podświetlenie trasy ze spisu połączeń (niebieska linia) — nie to samo co zaznaczenie. */
function clearNetlistRouteHighlight() {
  const root = typeof currentSymNode === "function" ? currentSymNode() : null;
  if (root) clearWireConnHighlight(root);
  if (state.selectedConnId) {
    state.selectedConnId = "";
    const sel = document.getElementById("netlistConn");
    if (sel) sel.value = "";
    if (typeof refreshNetlistUI === "function") refreshNetlistUI();
  }
}
function selEls() {
  return state.selection.length ? state.selection : state.activeEl ? [state.activeEl] : [];
}

let childPair, bboxInRoot, rebuildEditDefs, rebuildHost;
let targetSheet = () => null,
  connectionDiagnostics = () => ({ ok: true, reason: "" }),
  routeSelectedConnection = () => {},
  routeAllConnections = () => {},
  promoteSelectionToConnection = async () => null,
  sheetWireHealth = () => ({ orphans: [], bare: [], missing: [] }),
  collectNetlistProposals = () => [],
  nextProposalId = () => "NEW1",
  resolveEndpoint = () => ({ ok: false });
let applyConnectionRecord = () => null;
let refreshNetlistUI = () => {},
  loadNetlistText = async () => false,
  autoLoadNetlistForSheet = async () => false,
  selectConnectionFromElement = () => false;
let scheduleNetlistRefresh = () => {};

/** Przywróć końce przewodu do pinów z data-from / data-to. */
function rePinWireToMeta(el) {
  if (!isWireGeometry(el) || !el.getAttribute("data-conn-id")) return;
  const sheet = typeof targetSheet === "function" ? targetSheet() : null;
  if (!sheet) return;
  rePinWireEndsFromMeta(
    el,
    (raw) => {
      const r = resolveEndpoint(sheet, NetlistModel.parseEndpoint(raw));
      return r?.ok ? { x: r.x, y: r.y } : null;
    },
    state.wireMarkMode
  );
}

/** Czy punkt 0 geometrii odpowiada data-from (vs data-to). */
function wireStartIsFrom(el) {
  const sheet = typeof targetSheet === "function" ? targetSheet() : null;
  const fromRaw = (el.getAttribute("data-from") || "").trim();
  const toRaw = (el.getAttribute("data-to") || "").trim();
  if (!sheet || !fromRaw || !toRaw) return true;
  const pts = parsePoints(el);
  if (!pts.length) return true;
  const fromEp = resolveEndpoint(sheet, NetlistModel.parseEndpoint(fromRaw));
  const toEp = resolveEndpoint(sheet, NetlistModel.parseEndpoint(toRaw));
  if (!fromEp?.ok || !toEp?.ok) return true;
  const dFrom = Math.hypot(pts[0][0] - fromEp.x, pts[0][1] - fromEp.y);
  const dTo = Math.hypot(pts[0][0] - toEp.x, pts[0][1] - toEp.y);
  return dFrom <= dTo;
}
let buildSymbolList = () => {},
  buildElementList = () => {},
  syncListSelection = () => {},
  syncElementListSelection = () => {};
let validateSymbolConnections = () => [],
  renderElementProps = () => {},
  compareListText = (a, b) => String(a).localeCompare(String(b), "pl");
let renameSelectedListItem = () => false;
let startDraw = () => {},
  startLineDraw = () => {},
  addDrawPoint = () => {},
  drawPreview = () => {};
let finishShape = async () => {},
  finishLineDraw = () => {},
  exitDraw = () => {},
  applyObliqueStubToSelection = () => false,
  jointCandidates = () => [],
  nearestJoint = () => null;
let ensurePerm, writeHandle, saveFile, save, saveAs, saveProjectToDisk, hasPerm;
let selectedRecords, strokeRecords, strokeTarget, fillRecords, fillTarget, textRecords, commonValue;

function wireRenderPipeline() {
  const p = createRenderPipeline({
    state,
    XLINK,
    createSVGPoint: () => stage.createSVGPoint(),
    isSheetActive,
    currentSymNode,
  });
  ({ childPair, bboxInRoot, rebuildEditDefs, rebuildHost } = p);
}

function wireNetlistRouting() {
  const applyApi = createConnectionApply({
    state,
    getSheet: () => (typeof targetSheet === "function" ? targetSheet() : null),
    getSettingsCfg: () => settingsCfg,
    wireColorFn: wireColor,
    mkEl,
  });
  applyConnectionRecord = applyApi.applyConnectionRecord;
  const n = createNetlistRouting({
    state,
    XLINK,
    num,
    fmt,
    mkEl,
    currentSymNode,
    childPair,
    bboxInRoot,
    isConnPoint,
    connEndpointCoords,
    updateConnLabel,
    pushUndo,
    render,
    setStatus,
    selectSheet,
    getHost: () => scene.host,
    askConfirm,
    askChoice,
    getSettingsCfg: () => settingsCfg,
    persistConnections: () => saveProjectSettings(),
    nearestJoint: (...a) => nearestJoint(...a),
    wireColor,
    applyConnectionRecord,
  });
  ({
    targetSheet,
    connectionDiagnostics,
    routeSelectedConnection,
    routeAllConnections,
    promoteSelectionToConnection,
    sheetWireHealth,
    collectNetlistProposals,
    nextProposalId,
    resolveEndpoint,
  } = n);
  const ui = createNetlistUi({
    getState: () => state,
    setStatus,
    connectionDiagnostics,
    collectNetlistProposals,
    saveProject,
    getSettingsCfg: () => settingsCfg,
    saveProjectSettings,
    getTargetSheet: () => (typeof targetSheet === "function" ? targetSheet() : null),
    sheetWireHealth,
    promoteSelectionToConnection,
    currentSymNode,
    selectSheetElement,
    applyConnectionRecord,
  });
  ({ refreshNetlistUI, loadNetlistText, autoLoadNetlistForSheet, selectConnectionFromElement } = ui);
  const live = createNetlistLiveValidator({ refreshNetlistUI, debounceMs: 180 });
  scheduleNetlistRefresh = live.scheduleRefresh;
  ui.wireNetlistDom();
  wireDrawMode();
}

function wireDrawMode() {
  const d = createDrawMode({
    state,
    stage,
    getScene: () => scene,
    currentSymNode,
    setStatus,
    syncDrawBanner: () => syncDrawBanner(),
    syncSelectionToolbar,
    clearHighlight,
    captureToolStyleFromToolbar,
    pushUndo: () => pushUndo(),
    render,
    snap,
    fmt,
    mkEl,
    mkPrev,
    SVGNS,
    XLINK,
    num,
    rotatePoint,
    definitionForUseElement,
    isConnGroup: (...a) => isConnGroup(...a),
    pushConnContactCandidates: (...a) => pushConnContactCandidates(...a),
    finishConnDraw: (...a) => finishConnDraw(...a),
    nextProposalId: () => nextProposalId(),
    wireColor,
    styleShape,
    styleLine,
    styleText,
    styleNode,
    applyConnectionRecord: (...a) => applyConnectionRecord(...a),
    askText,
  });
  ({
    startDraw,
    startLineDraw,
    addDrawPoint,
    drawPreview,
    finishShape,
    finishLineDraw,
    exitDraw,
    applyObliqueStubToSelection,
    jointCandidates,
    nearestJoint,
  } = d);
}

function renameSheetTitleFromList(sh, title) {
  if (!sh || sh === state.lib) return { ok: false, message: status.pickSheet };
  const next = String(title || "").trim();
  if (next === sheetDisplayTitle(sh)) return { ok: true, unchanged: true };
  pushUndo();
  const res = applySheetDisplayTitle(sh, next);
  if (!res.ok) {
    if (state.undo.length) state.undo.pop();
    return res;
  }
  buildSymbolList();
  syncListSelection();
  syncToolbarContext();
  render();
  setStatus(res.message);
  saveProject();
  return res;
}
function renameSymbolTitleFromList(sym, title) {
  if (!sym || state.active !== state.lib) return { ok: false, message: status.symbolPickLibrary };
  pushUndo();
  const res = applySymbolDisplayName(sym, title);
  if (!res.ok || res.unchanged) {
    if (state.undo.length) state.undo.pop();
    return res;
  }
  buildSymbolList();
  syncListSelection();
  syncNameFields();
  markSheetDirty(state.lib);
  setStatus(res.message);
  saveProject();
  return res;
}
function wireSidebarLists() {
  const s = createSidebarLists({
    state,
    symlist,
    schlist,
    elemList,
    elemSec,
    elemProps,
    elemPropsTitle,
    elemPropsBody,
    schEmpty,
    symEmpty,
    elemEmpty,
    isSheetActive,
    currentSymNode,
    selEls,
    selectSheet: (...a) => selectSheet(...a),
    selectSymbol: (...a) => selectSymbol(...a),
    selectSheetElement: (...a) => selectSheetElement(...a),
    selectSheetElements: (...a) => selectSheetElements(...a),
    insertUse: (...a) => insertUse(...a),
    setStatus,
    renameSheetTitle: renameSheetTitleFromList,
    renameSymbolTitle: renameSymbolTitleFromList,
  });
  ({
    buildSymbolList,
    buildElementList,
    syncListSelection,
    syncElementListSelection,
    validateSymbolConnections,
    renderElementProps,
    compareListText,
    renameSelectedListItem,
  } = s);
}

function wireFileIo() {
  const f = createFileIo({
    getState: () => state,
    setStatus,
    inlineSheetDefs,
    flushLibrary,
    flushDoc,
    buildSymbolList,
    syncListSelection,
    idbSet,
    XLINK,
    saveProjectSettings,
    getFileHandleByPath,
    onDirtyChange: () => {
      syncDirtyIndicator();
    },
    validateBeforeSave: (st) => {
      if (!st.netlist || typeof connectionDiagnostics !== "function") return null;
      const h = summarizeNetlistHealth(st.netlist, connectionDiagnostics);
      if (!h.bad) return null;
      return { bad: true, message: h.summary };
    },
  });
  ({ ensurePerm, writeHandle, saveFile, save, saveAs, saveProjectToDisk, hasPerm } = f);
  document.getElementById("btnSave").onclick = () => {
    void save();
  };
  document.getElementById("btnSaveAs").onclick = saveAs;
}

function wireSelectionModel() {
  const s = createSelectionModel({
    state,
    getHost: () => scene.host,
    currentSymNode,
    selEls,
    isConnLabelMode,
    connParts,
    isConnGroup,
    isConnPoint,
    connStrokeTargets,
    connFillTarget,
    connStyleSampleEl,
  });
  ({ selectedRecords, strokeRecords, strokeTarget, fillRecords, fillTarget, textRecords, commonValue } = s);
}
function appendWireSelectionHighlight(cel, active) {
  appendWireStrokeOverlay(scene.sel, cel, { active, fmt, SVGNS });
}

function highlightActive() {
  clearHighlight();
  const node = currentSymNode();
  if (!node) {
    syncSelectionToolbar();
    return;
  }
  const cloneRoot = scene.hostRoot;
  if (!cloneRoot) {
    syncSelectionToolbar();
    return;
  }
  const pad = 1;
  const selected = new Set(selEls());
  selEls().forEach((el) => {
    const { cel } = childPair(node, el, cloneRoot);
    if (!cel) return;
    if (isWireGeometry(el) || isWireGeometry(cel)) {
      appendWireSelectionHighlight(cel, el === state.activeEl);
      return;
    }
    let bb;
    try {
      if (isConnLabelMode() && el === state.connLabelSel) {
        const labelCel = cel.querySelector('[data-part="label"]');
        if (!labelCel) return;
        bb = bboxInRoot(labelCel, cloneRoot);
      } else {
        bb = bboxInRoot(cel, cloneRoot);
      }
    } catch (e) {
      return;
    }
    const r = document.createElementNS(SVGNS, "rect");
    r.setAttribute("x", fmt(bb.x - pad));
    r.setAttribute("y", fmt(bb.y - pad));
    r.setAttribute("width", fmt(bb.width + 2 * pad));
    r.setAttribute("height", fmt(bb.height + 2 * pad));
    r.setAttribute("fill", el === state.activeEl ? "rgba(37,99,235,0.08)" : "none");
    r.setAttribute("stroke", "#2563eb");
    r.setAttribute("stroke-width", "1");
    r.setAttribute("stroke-dasharray", "4 2");
    r.setAttribute("vector-effect", "non-scaling-stroke");
    r.style.pointerEvents = "none";
    scene.sel.appendChild(r);
  });
  // Podświetlenie ze spisu — ten sam overlay, bez mutacji stroke na trasie
  if (state.selectedConnId) {
    const wire = findWireByConnId(node, state.selectedConnId);
    if (wire && !selected.has(wire)) {
      const { cel } = childPair(node, wire, cloneRoot);
      if (cel) appendWireSelectionHighlight(cel, false);
    }
  }
  clearWireConnHighlight(node);
  syncNameFields();
  syncElementListSelection();
  syncSelectionToolbar();
}
function applyView() {
  scene.world.setAttribute("transform", `translate(${state.panX} ${state.panY}) scale(${state.zoom})`);
  ensureGrid();
  savePrefs();
}
let gridB = { x0: -40, x1: 460, y0: -60, y1: 360 };
function ensureGrid() {
  if (!scene?.world || !scene.world.getScreenCTM) return;
  const r = stage.getBoundingClientRect();
  if (!r.width) return;
  let tl, br;
  try {
    tl = clientToLocal(r.left, r.top);
    br = clientToLocal(r.right, r.bottom);
  } catch (e) {
    return;
  }
  const s = state.step,
    m = s * 8;
  // zakres liczony z BIEZACEGO widoku (kurczy sie i rozszerza), kwantyzowany do kroku
  const nx0 = Math.floor((Math.min(tl.x, br.x) - m) / s) * s;
  const nx1 = Math.ceil((Math.max(tl.x, br.x) + m) / s) * s;
  const ny0 = Math.floor((Math.min(tl.y, br.y) - m) / s) * s;
  const ny1 = Math.ceil((Math.max(tl.y, br.y) + m) / s) * s;
  if (nx0 !== gridB.x0 || nx1 !== gridB.x1 || ny0 !== gridB.y0 || ny1 !== gridB.y1) {
    gridB = { x0: nx0, x1: nx1, y0: ny0, y1: ny1 };
    drawGrid();
  }
}

// ---- siatka ----
function drawGrid() {
  scene.grid.innerHTML = "";
  let step = state.step;
  const x0 = gridB.x0,
    x1 = gridB.x1,
    y0 = gridB.y0,
    y1 = gridB.y1;
  while ((x1 - x0) / step + (y1 - y0) / step > 1400) step *= 2; // ochrona wydajności przy oddaleniu
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
    const major = Math.abs(x % (step * 5)) < 1e-6;
    line(scene.grid, x, y0, x, y1, major ? "#cbd5e1" : "#eef2f7", major ? 0.4 : 0.25);
  }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    const major = Math.abs(y % (step * 5)) < 1e-6;
    line(scene.grid, x0, y, x1, y, major ? "#cbd5e1" : "#eef2f7", major ? 0.4 : 0.25);
  }
  // osie
  line(scene.grid, x0, 0, x1, 0, "#94a3b8", 0.5);
  line(scene.grid, 0, y0, 0, y1, "#94a3b8", 0.5);
}
function line(parent, x1, y1, x2, y2, stroke, w) {
  const l = document.createElementNS(SVGNS, "line");
  l.setAttribute("x1", x1);
  l.setAttribute("y1", y1);
  l.setAttribute("x2", x2);
  l.setAttribute("y2", y2);
  l.setAttribute("stroke", stroke);
  l.setAttribute("stroke-width", w);
  parent.appendChild(l);
  return l;
}

// ---- projekt: biblioteka + pliki schematów ----
document.getElementById("btnOpen").onclick = openProject;
const btnMenuOpen = document.getElementById("btnMenuOpen");
if (btnMenuOpen) btnMenuOpen.onclick = () => document.getElementById("btnOpen")?.click();
const btnMenuSave = document.getElementById("btnMenuSave");
if (btnMenuSave) btnMenuSave.onclick = () => document.getElementById("btnSave")?.click();
document.getElementById("btnNewProject").onclick = () => {
  newProject();
};
document.getElementById("btnNewLibrary").onclick = () => {
  newLibrary();
};
document.getElementById("fileInput").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  f.text().then((t) => importLoose(t, f.name));
};

function resolveLibSymbolNode(id) {
  return resolveLibSymbol(state.lib?.svg, id);
}
function resolveSheetSymbolNode(id, sheetSvg) {
  return resolveSheetSymbol(sheetSvg || state.srcSvg, id);
}
function resolveSymbolNode(id, sheetSvg) {
  return resolveSymbol(state.lib?.svg, sheetSvg || state.srcSvg, id);
}
function migrateProjectSymbolNames() {
  if (!migrateProject) return false;
  return migrateProject();
}
let migrateProject;
function wireProjectMigrate() {
  ({ migrateProject } = createProjectMigrator({
    state,
    SVGNS,
    XLINK,
    normalizeLibLayout,
    stripSymPrefixInSvg,
    rewriteSymbolIdRefs,
    migrateConnModel,
    buildSymbolList,
    flushLibrary,
    markDirty,
  }));
}
function adoptLibraryFromParsed(parsed, name, handle) {
  if (!parsed) return false;
  prepareLibrarySvg(parsed, SVGNS);
  state.lib = createLibraryRecord(parsed, name, handle);
  return true;
}
function selectedUseOnSheet() {
  const node = currentSymNode();
  if (!node || state.active === state.lib) return null;
  const pick = (el) => (el && el.tagName && el.tagName.toLowerCase() === "use" && el.parentNode === node ? el : null);
  return pick(state.activeEl) || (state.selection.length === 1 ? pick(state.selection[0]) : null);
}
function selectedConnOnSheet() {
  if (state.selection.length !== 1) return null;
  const el = state.selection[0],
    node = currentSymNode();
  return el && node && isConnGroup(el) && el.parentNode === node ? el : null;
}
function applyStaticWording() {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("lblSymName", W.field.name);
  set("lblInstPrefix", W.field.designation);
  set("lblSymDesc", W.field.description);
  set("lblSymDesc2", W.field.description2);
  set("lblSelPropRef", W.field.designation);
  set("lblSelPropNum", W.field.elementNum);
  set("lblSelPropDesc", W.field.description);
  set("lblSelPropDesc2", W.field.description2);
  set("lblSelPropPin", W.field.pin);
  set("lblSelPropText", W.field.text);
  set("lblSelPropLen", W.field.length);
  set("lblSelPropDir", W.field.direction);
  set("lblSelPropSym", W.field.symbol);
  set("lblInstStart", W.field.numberFrom);
  set("lblGroupSymbol", W.group.symbol);
  set("txtSaveSymbol", W.save.params);
  set("txtSaveResource", W.save.params);
  set("txtInstNumbered", W.field.numberToggle);
  set("choiceDialogCancel", W.choice.cancel);
  set("choiceDialogLocal", W.choice.local);
  set("choiceDialogLib", W.choice.library);
  const tip = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.title = text;
  };
  tip("lblSymName", W.fieldTip.symbolName);
  tip("symName", W.fieldTip.symbolName);
  tip("lblInstPrefix", W.fieldTip.symbolDesignation);
  tip("instPrefix", W.fieldTip.symbolDesignation);
  tip("lblSymDesc", W.fieldTip.symbolDescription);
  tip("symDesc", W.fieldTip.symbolDescription);
  tip("lblSymDesc2", W.fieldTip.symbolDescription2);
  tip("symDesc2", W.fieldTip.symbolDescription2);
  tip("lblSelPropRef", W.fieldTip.instancePrefix);
  tip("selPropRef", W.fieldTip.instancePrefix);
  tip("lblSelPropNum", W.fieldTip.instanceNum);
  tip("selPropNum", W.fieldTip.instanceNum);
  tip("lblSelPropDesc", W.fieldTip.instanceDescription);
  tip("selPropDesc", W.fieldTip.instanceDescription);
  tip("lblSelPropDesc2", W.fieldTip.instanceDescription2);
  tip("selPropDesc2", W.fieldTip.instanceDescription2);
  tip("lblSelPropPin", W.fieldTip.connPin);
  tip("selPropPin", W.fieldTip.connPin);
  tip("lblSelPropText", W.fieldTip.selectionText);
  tip("selPropText", W.fieldTip.selectionText);
  tip("lblSelPropLen", W.fieldTip.leadLength);
  tip("selPropLen", W.fieldTip.leadLength);
  tip("lblSelPropDir", W.fieldTip.leadDir);
  tip("selPropDir", W.fieldTip.leadDir);
  tip("lblSelPropSym", W.fieldTip.instanceSymbol);
  tip("selPropSym", W.fieldTip.instanceSymbol);
  tip("lblInstNumbered", W.fieldTip.numberToggle);
  tip("txtInstNumbered", W.fieldTip.numberToggle);
  tip("btnAlignLeft", W.align.left);
  tip("btnAlignCenterH", W.align.centerH);
  tip("btnAlignRight", W.align.right);
  tip("btnAlignTop", W.align.top);
  tip("btnAlignCenterV", W.align.centerV);
  tip("btnAlignBottom", W.align.bottom);
  const instPrefix = document.getElementById("instPrefix");
  if (instPrefix) instPrefix.placeholder = W.placeholder.designation;
  const symName = document.getElementById("symName");
  if (symName) symName.placeholder = W.placeholder.symbolName;
  const symDesc = document.getElementById("symDesc");
  if (symDesc) symDesc.placeholder = W.placeholder.description;
  const symDesc2 = document.getElementById("symDesc2");
  if (symDesc2) symDesc2.placeholder = W.placeholder.description2;
  const connRef = document.getElementById("connMetaRef");
  const connPin = document.getElementById("connMetaPin");
  const selPropText = document.getElementById("selPropText");
  const setDate = document.getElementById("setDate");
  if (connRef) connRef.placeholder = W.placeholder.connRef;
  if (connPin) connPin.placeholder = W.placeholder.connPin;
  if (selPropText) selPropText.placeholder = W.placeholder.text;
  if (setDate) setDate.placeholder = W.placeholder.dateFormat;
  const btnSaveSymbol = document.getElementById("btnSaveSymbol");
  if (btnSaveSymbol) btnSaveSymbol.title = W.saveTip.symbol;
  const btnSave = document.getElementById("btnSave");
  if (btnSave) btnSave.title = W.saveTip.unified;
  const setBtnText = (id, text) => {
    const el = document.getElementById(id);
    const t = el && el.querySelector(".btn-text");
    if (t) t.textContent = text;
  };
  setBtnText("btnOpen", W.chrome.open);
  setBtnText("btnSave", W.chrome.save);
  setBtnText("btnRouteConn", W.chrome.route);
  setBtnText("btnRouteAllConn", W.chrome.routeAll);
  setBtnText("btnBreakPoint", W.chrome.breakPoint);
  const wireMarkSel = document.getElementById("wireMarkMode");
  if (wireMarkSel) {
    wireMarkSel.title = W.fieldTip.wireMarkMode;
    const optTip = { local: W.fieldTip.wireMarkLocal, other: W.fieldTip.wireMarkOther, both: W.fieldTip.wireMarkBoth };
    [...wireMarkSel.options].forEach((o) => {
      if (W.wireMark[o.value]) o.textContent = W.wireMark[o.value];
      if (optTip[o.value]) o.title = optTip[o.value];
    });
  }
  setBtnText("btnFileMenu", W.chrome.fileMenu);
  setBtnText("btnShortcuts", W.chrome.shortcuts);
  setBtnText("btnEmptyOpenProject", W.empty.openProjectCta);
  setBtnText("btnNewProject", W.dialog.newProject);
  setBtnText("btnNewSheet", W.dialog.newSheet);
  setBtnText("btnNewLibrary", W.dialog.newLibrary);
  setBtnText("btnMenuOpen", W.dialog.openProject + "\u2026");
  setBtnText("btnLib", W.chrome.openLibrary);
  setBtnText("btnMenuSave", W.chrome.save);
  setBtnText("btnSaveAs", W.chrome.saveAs);
}
function syncResourceNameFields(mode) {
  const lbl = document.getElementById("lblResourceName");
  const grp = document.getElementById("lblGroupResource");
  const inp = document.getElementById("resourceNameInput");
  const btn = document.getElementById("btnSaveResource");
  if (!mode || !inp) {
    if (inp) inp.value = "";
    return;
  }
  if (lbl) lbl.textContent = resourceNameLabel(mode);
  if (grp) {
    const g = { sheet: W.group.sheet, library: W.group.library, project: W.group.project };
    grp.textContent = g[mode] || "";
  }
  if (inp) {
    inp.placeholder = resourceNamePlaceholder(mode);
    if (mode === "sheet" && state.active && state.active !== state.lib) {
      inp.value = sheetDisplayTitle(state.active);
    } else if (mode === "library" && state.lib) {
      inp.value = state.lib.name || "";
    } else if (mode === "project" && state.dir) {
      inp.value = state.dir.name || "";
    } else inp.value = "";
    inp.disabled =
      mode === "project" ? !state.dir : mode === "library" ? !state.lib : mode === "sheet" ? !state.active : false;
  }
  if (btn) btn.title = paramsSaveTip(mode);
}
function syncLibrarySelectionInfo() {
  const info = document.getElementById("selectionInfo");
  if (!info) return;
  const sym = state.symbols.find((s) => s.id === state.selId);
  if (sym) {
    const label = symbolCatalogLabel(sym.node, sym.id);
    const ozn = symbolDesignation(sym.node, sym.id);
    const showOzn = !!label && !!ozn && ozn !== label;
    info.textContent = symbolSelectionSummary(label, showOzn ? ozn : null);
    info.title = W.selection.symbolTitle(label);
  } else {
    info.textContent = W.selection.pickSymbol;
    info.title = W.selection.pickSymbolTitle;
  }
}
function syncNameFields() {
  const nameInp = document.getElementById("symName");
  const prefixInp = document.getElementById("instPrefix");
  const descInp = document.getElementById("symDesc");
  const desc2Inp = document.getElementById("symDesc2");
  const numChk = document.getElementById("instNumbered"),
    startInp = document.getElementById("instStart");
  const btnSym = document.getElementById("btnSaveSymbol");
  if (state.active === state.lib) {
    const sym = state.symbols.find((s) => s.id === state.selId);
    if (sym) {
      if (btnSym) btnSym.disabled = false;
      const rule = refBaseForSymbol(state.selId);
      if (nameInp) {
        nameInp.disabled = false;
        nameInp.value = symbolDisplayName(sym.node) || symbolCatalogLabel(sym.node, sym.id);
      }
      if (prefixInp) {
        prefixInp.disabled = false;
        prefixInp.value = symbolDesignation(sym.node, sym.id);
        prefixInp.placeholder = W.placeholder.designation;
      }
      if (descInp) {
        descInp.disabled = false;
        descInp.value = symbolDescription(sym.node);
      }
      if (desc2Inp) {
        desc2Inp.disabled = false;
        desc2Inp.value = symbolDescription2(sym.node);
      }
      if (numChk) {
        numChk.disabled = false;
        const numbered = sym.node.getAttribute("data-inst-numbered");
        numChk.checked = numbered === "" ? !!rule.numbered : numbered !== "0";
      }
      if (startInp) {
        startInp.disabled = false;
        startInp.value = sym.node.getAttribute("data-inst-start") || String(rule.start || 1);
      }
      syncLibrarySelectionInfo();
      syncToolbarContext();
      return;
    }
  }
  if (btnSym) btnSym.disabled = true;
  if (nameInp) {
    nameInp.disabled = true;
    nameInp.value = "";
  }
  if (prefixInp) {
    prefixInp.disabled = true;
    prefixInp.value = "";
    prefixInp.placeholder = W.placeholder.designation;
  }
  if (descInp) {
    descInp.disabled = true;
    descInp.value = "";
  }
  if (desc2Inp) {
    desc2Inp.disabled = true;
    desc2Inp.value = "";
  }
  if (numChk) {
    numChk.disabled = true;
  }
  if (startInp) {
    startInp.disabled = true;
    startInp.value = "1";
  }
  if (state.active === state.lib) syncLibrarySelectionInfo();
  syncToolbarContext();
}
function saveSymbol() {
  const sym = state.symbols.find((s) => s.id === state.selId);
  if (!sym || state.active !== state.lib) {
    setStatus(status.symbolPickLibrary);
    return;
  }
  const fallbackName = symbolDisplayName(sym.node) || symbolCatalogLabel(sym.node, sym.id);
  const form = readSymbolFormFromDom(document, { fallbackName });
  const undoBefore = state.undo.length;
  pushUndo();
  const result = applySymbolForm({
    sym,
    libSvg: state.lib.svg,
    sheets: state.sheets,
    form,
    rewriteSymbolIdRefs,
    XLINK,
  });
  if (!result.ok) {
    if (state.undo.length > undoBefore) state.undo.pop();
    setStatus(result.message);
    return;
  }
  if (result.newId) state.selId = result.newId;
  buildSymbolList();
  syncListSelection();
  syncNameFields();
  markSheetDirty(state.lib);
  setStatus(result.message);
  saveProject();
}
async function saveResourceName() {
  const onLib = state.active === state.lib;
  const mode = onLib ? "library" : state.dir ? "project" : null;
  if (!mode) {
    return;
  }
  const inp = document.getElementById("resourceNameInput");
  const v = (inp?.value || "").trim();
  const rw = { writeHandle, getFileHandleByPath };
  if (mode === "library") {
    if (!state.lib) {
      return;
    }
    const res = await renameLibraryOnDisk({
      lib: state.lib,
      newFileName: v,
      dir: state.dir,
      settingsCfg,
      readWrite: rw,
    });
    if (!res.ok) {
      setStatus(res.message);
      return;
    }
    if (!res.unchanged) await saveProjectSettings();
    syncResourceNameFields("library");
    syncSaveButtons();
    setStatus(res.message);
    saveProject();
    return;
  }
  if (mode === "project") {
    if (!state.dir) {
      return;
    }
    const res = await renameProjectFolderOnDisk({ dir: state.dir, newName: v, idbSet });
    if (!res.ok) {
      setStatus(res.message);
      return;
    }
    if (res.dir) state.dir = res.dir;
    syncResourceNameFields("project");
    setStatus(res.message);
  }
}
function syncSaveButtons() {
  const btnSave = document.getElementById("btnSave");
  if (!btnSave) return;
  btnSave.title = saveActionTip({ hasDir: !!state.dir, fileName: state.active?.name });
  btnSave.disabled = !state.active?.svg;
}
function syncToolbarContext() {
  const onLib = state.active === state.lib;
  const onSheet = !!(state.active && state.active !== state.lib);
  const symSelected = onLib && state.symbols.some((s) => s.id === state.selId);
  const selectionPropsMode = resolveSelectionPropsMode({
    onSheet,
    selection: state.selection,
    connLabelSel: state.connLabelSel,
  });
  const groups = resolveToolbarGroups({
    onLib,
    onSheet,
    symSelected,
    hasSelection: state.selection.length > 0,
    hasDir: !!state.dir,
    selectionPropsMode,
  });
  const { resourceNameMode, selectionPropsMode: propsMode, ...flags } = groups;
  const toggle = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("context-hidden", !show);
  };
  Object.entries(flags).forEach(([id, show]) => {
    if (typeof show === "boolean") toggle(id, show);
  });
  syncResourceNameFields(resourceNameMode);
  syncSelectionProps(propsMode);
  syncSaveButtons();
}
function ensureLib() {
  if (!state.lib) {
    const p = parseSvg(baseDocText());
    state.lib = { handle: null, name: "E-00_symbole.svg", svg: p.svg, doc: p.doc };
  }
}

async function newProject() {
  if (!window.showDirectoryPicker) {
    setStatus(W.create.noFsApi, { toast: true, tone: "warning" });
    return;
  }
  const dirtyN = countDirtySheets(state.sheets);
  if (dirtyN && !(await askConfirm(W.confirm.dirtyNewProject(dirtyN), { title: W.dialog.newProject, danger: true })))
    return;
  let dir;
  try {
    dir = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (e) {
    if (e.name !== "AbortError") console.warn(e);
    return;
  }
  const empty = await isDirectoryEmpty(dir);
  if (!empty && !(await askConfirm(W.confirm.folderNotEmpty, { title: W.dialog.folderNotEmpty }))) return;
  const res = await initializeNewProjectOnDisk({
    dir,
    writeHandle,
    styleContent: DEFAULT_STYLE,
    svgNs: SVGNS,
    todayStr,
  });
  if (!res.ok) {
    setStatus(res.message || W.create.projectFailed);
    return;
  }
  state.dir = dir;
  idbSet("dir", dir).catch(() => {});
  settingsCfg = res.settings;
  state.sheets = res.firstSheet ? [res.firstSheet] : [];
  state.projectNetlists = [];
  state.netlist = null;
  adoptLibraryFromParsed(res.library.parsed, res.library.name, res.library.handle);
  state.libHandle = res.library.handle;
  settingsCfg.library = res.library.relPath;
  idbSet("libHandle", res.library.handle).catch(() => {});
  try {
    migrateProjectSymbolNames();
    buildSymbolList();
    if (res.firstSheet) selectSheet(res.firstSheet);
    else {
      const s0 = state.symbols[0];
      if (s0) selectSymbol(s0.id);
      else {
        state.active = state.lib;
        state.srcSvg = state.lib.svg;
        state.srcDoc = state.lib.doc;
        state.selId = null;
        render();
      }
    }
    showGrantIfNeeded(dir);
    setStatus(res.message);
    saveProject();
  } catch (e) {
    console.error(e);
    setStatus(W.create.projectFailed + ": " + (e.message || e));
  }
}

async function linkLibraryHandleToProject(handle, walkedFiles) {
  if (!state.dir || !handle) return;
  const rel = await librarySettingPathForHandle(state.dir, handle, walkedFiles);
  settingsCfg.library = normalizeRelPath(rel);
  await saveProjectSettings();
}

async function pickSaveLocationInProject(suggestedName, description) {
  if (!state.dir || !window.showSaveFilePicker) return null;
  try {
    return await window.showSaveFilePicker({
      startIn: state.dir,
      suggestedName,
      types: [{ description, accept: { "image/svg+xml": [".svg"] } }],
    });
  } catch (e) {
    if (e?.name !== "AbortError") console.warn(e);
    return null;
  }
}

async function newLibrary() {
  if (state.lib?.dirty && !(await askConfirm(W.confirm.dirtyLibrary, { title: W.dialog.newLibrary, danger: true })))
    return;
  const styleContent = DEFAULT_STYLE;
  if (state.dir) {
    if (!(await ensurePerm(state.dir))) {
      setStatus(W.create.noProjectWrite);
      return;
    }
    let walked = await walkDir(state.dir, { maxDepth: DEFAULT_WALK_DEPTH }).catch(() => ({ files: [] }));
    const sheetPaths = sheetRelPathSet(state.sheets);
    const existingNames = existingLibrarySvgNames(walked.files, sheetPaths);
    const suggested = uniqueLibraryFileName(existingNames);
    const saveHandle = await pickSaveLocationInProject(suggested, "Biblioteka symboli SVG");
    let res;
    if (saveHandle) {
      const rel = await librarySettingPathForHandle(state.dir, saveHandle, walked.files);
      const parsed = parseEmptyLibrary({ styleContent, svgNs: SVGNS });
      if (!parsed) {
        setStatus(W.create.libraryFailed);
        return;
      }
      await writeHandle(saveHandle, serializeSvg(parsed.svg));
      res = {
        ok: true,
        handle: saveHandle,
        name: saveHandle.name,
        relPath: normalizeRelPath(rel || saveHandle.name),
        parsed,
      };
    } else {
      res = await createLibraryInProject({ dir: state.dir, writeHandle, styleContent, svgNs: SVGNS, existingNames });
    }
    if (!res.ok) {
      setStatus(res.message || W.create.libraryFailed);
      return;
    }
    adoptLibraryFromParsed(res.parsed, res.name, res.handle);
    state.libHandle = res.handle;
    settingsCfg.library = res.relPath;
    idbSet("libHandle", res.handle).catch(() => {});
    buildSymbolList();
    const s0 = state.symbols[0];
    if (s0) selectSymbol(s0.id);
    else {
      state.active = state.lib;
      state.srcSvg = state.lib.svg;
      state.srcDoc = state.lib.doc;
      state.selId = null;
      render();
    }
    await saveProjectSettings();
    setStatus(W.create.libraryInProject(res.relPath));
    saveProject();
    return;
  }
  const res = await createLibraryStandalone({
    styleContent,
    svgNs: SVGNS,
    writeHandle,
    showSaveFilePicker: window.showSaveFilePicker?.bind(window),
  });
  if (!res.ok) {
    if (!res.aborted && res.message) setStatus(res.message);
    return;
  }
  adoptLibraryFromParsed(res.parsed, res.name, res.handle);
  state.libHandle = res.handle;
  idbSet("libHandle", res.handle).catch(() => {});
  buildSymbolList();
  const s0 = state.symbols[0];
  if (s0) selectSymbol(s0.id);
  else {
    state.active = state.lib;
    state.srcSvg = state.lib.svg;
    state.srcDoc = state.lib.doc;
    state.selId = null;
    render();
  }
  setStatus(W.create.libraryStandalone(res.name));
  saveProject();
}

async function openProject() {
  if (!window.showDirectoryPicker) {
    document.getElementById("fileInput").click();
    return;
  }
  let dir;
  try {
    dir = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (e) {
    if (e.name !== "AbortError") console.warn(e);
    return;
  }
  state.dir = dir;
  idbSet("dir", dir).catch(() => {});
  await scanProject(dir);
}
/** Wczytuje arkusze i metadane projektu z wyniku walkDir — zawsze nadpisuje state.sheets treścią z dysku. */
async function applyWalkedProject(walked, opts = {}) {
  const skipLib = !!opts.skipLib,
    skipSettings = !!opts.skipSettings;
  if (!skipSettings) {
    const projEntry = walked.files.find((f) => f.name.toLowerCase() === "projekt.json");
    if (projEntry) {
      try {
        const cfg = JSON.parse(await (await projEntry.handle.getFile()).text());
        settingsCfg = Object.assign({}, SETTINGS_DEFAULT, cfg);
      } catch (e) {
        settingsCfg = Object.assign({}, SETTINGS_DEFAULT);
      }
    } else if (opts.resetSettings) settingsCfg = Object.assign({}, SETTINGS_DEFAULT);
    if (!settingsCfg.date) settingsCfg.date = todayStr();
  }
  const svgEntries = walked.files.filter((f) => /\.svg$/i.test(f.name));
  const netlistEntries = walked.files.filter((f) => /^polaczenia.*\.md$/i.test(f.name));
  state.projectNetlists = netlistEntries.map((f) => ({ name: f.name, relPath: f.relPath, handle: f.handle }));
  const sheets = [],
    libCandidates = [];
  const prevByKey = new Map(state.sheets.map((sh) => [sheetKey(sh), sh]));
  for (const f of svgEntries) {
    let text;
    try {
      text = await (await f.handle.getFile()).text();
    } catch (e) {
      continue;
    }
    const p = parseSvg(text);
    if (!p) continue;
    const sid = firstSchId(p.svg);
    if (sid) {
      const key = f.relPath || f.name;
      const prev = prevByKey.get(key);
      if (prev?.dirty) {
        sheets.push(prev);
        continue;
      }
      sheets.push({
        handle: f.handle,
        name: f.name,
        relPath: f.relPath,
        svg: p.svg,
        doc: p.doc,
        id: sid,
        dirty: false,
      });
    } else if (hasLibSymbols(p.svg) || /E-00/i.test(f.name))
      libCandidates.push({ handle: f.handle, name: f.name, relPath: f.relPath, parsed: p, isSheet: false });
  }
  state.sheets = sheets;
  if (!skipLib) {
    const libPick = await findLibraryInProject(walked, settingsCfg.library, libCandidates);
    if (libPick) {
      adoptLibraryFromParsed(libPick.parsed, libPick.name, libPick.handle);
      state.libHandle = libPick.handle;
      settingsCfg.library = normalizeRelPath(libPick.relPath);
      idbSet("libHandle", libPick.handle).catch(() => {});
      flushLibrary();
    } else ensureLib();
  }
  return sheets;
}
async function scanProject(dir) {
  let walked;
  try {
    walked = await walkDir(dir);
  } catch (e) {
    setStatus("Nie udało się odczytać folderu.");
    return;
  }
  const dirtyN = countDirtySheets(state.sheets);
  if (dirtyN && !(await askConfirm(W.confirm.dirtyOpenProject(dirtyN), { title: W.dialog.openProject, danger: true })))
    return;
  const sheets = await applyWalkedProject(walked);
  try {
    migrateProjectSymbolNames();
    buildSymbolList();
    const first = sheets[0] ? sheets[0].id : state.symbols[0] ? state.symbols[0].id : null;
    if (first) selectSymbol(first);
    else {
      state.active = state.lib;
      state.srcSvg = state.lib.svg;
      state.srcDoc = state.lib.doc;
      render();
    }
    showGrantIfNeeded(dir);
    let statusMsg =
      "Otwarto projekt" +
      (dir.name ? " " + dir.name : "") +
      ": schematów " +
      sheets.length +
      (state.lib
        ? ", biblioteka " + (settingsCfg.library || state.lib.name)
        : " (brak biblioteki \u2014 kliknij Biblioteka\u2026)") +
      ".";
    if (state.projectNetlists.length) statusMsg += ", spisy: " + state.projectNetlists.length;
    if (
      typeof autoLoadNetlistForSheet === "function" &&
      (await autoLoadNetlistForSheet(typeof targetSheet === "function" ? targetSheet() : null, dir, { silent: true }))
    )
      statusMsg +=
        ", aktywny spis: " + state.netlist.connections.length + " po\u0142\u0105cze\u0144 (" + state.netlist.name + ")";
    setStatus(statusMsg);
    saveProject();
  } catch (e) {
    console.error(e);
    setStatus("B\u0142\u0105d otwarcia projektu: " + (e.message || e));
  }
}
function importLoose(text, name) {
  const p = parseSvg(text);
  if (!p) {
    setStatus("Niepoprawny SVG.");
    return;
  }
  if (firstSchId(p.svg)) {
    const sh = { handle: null, name, svg: p.svg, doc: p.doc, id: firstSchId(p.svg) };
    state.sheets.push(sh);
    buildSymbolList();
    selectSymbol(sh.id);
  } else {
    adoptLibraryFromParsed(p, name, null);
    buildSymbolList();
    const f = state.symbols[0];
    if (f) selectSymbol(f.id);
    else {
      state.active = state.lib;
      state.srcSvg = state.lib.svg;
      state.srcDoc = state.lib.doc;
      render();
    }
  }
  setStatus("Zaimportowano " + name + " (bez folderu \u2014 zapis przez „Zapisz jako”).");
  saveProject();
}

// ---- wspólna biblioteka symboli (osobny plik, zapamiętany globalnie) ----
async function pickLibrary() {
  if (!window.showOpenFilePicker) {
    document.getElementById("fileInput").click();
    return;
  }
  try {
    const wasLibrary = !state.active || state.active === state.lib;
    const pickerOpts = { types: [{ description: "SVG biblioteka symboli", accept: { "image/svg+xml": [".svg"] } }] };
    if (state.dir) pickerOpts.startIn = state.dir;
    const [h] = await window.showOpenFilePicker(pickerOpts);
    const f = await h.getFile();
    const p = parseSvg(await f.text());
    if (!p) {
      setStatus("Niepoprawny plik SVG.");
      return;
    }
    state.libHandle = h;
    adoptLibraryFromParsed(p, f.name, h);
    idbSet("libHandle", h).catch(() => {});
    flushLibrary();
    if (state.dir) {
      const walked = await walkDir(state.dir, { maxDepth: DEFAULT_WALK_DEPTH }).catch(() => ({ files: [] }));
      await linkLibraryHandleToProject(h, walked.files);
    }
    buildSymbolList();
    if (wasLibrary || !currentSymNode()) {
      const s0 = state.symbols[0];
      if (s0) selectSymbol(s0.id);
      else {
        state.active = state.lib;
        state.srcSvg = state.lib.svg;
        state.srcDoc = state.lib.doc;
        state.selId = null;
        render();
      }
    } else render();
    setStatus(
      "Biblioteka: " +
        f.name +
        " (" +
        state.symbols.length +
        " symboli" +
        (state.connIssues.length ? ", problemy przyłączy: " + state.connIssues.length : "") +
        (settingsCfg.library ? "; " + settingsCfg.library : "") +
        ")."
    );
  } catch (e) {
    if (e.name !== "AbortError") console.warn(e);
  }
}
async function restoreLibrary() {
  return restoreLibrarySnapshot();
}
async function saveProjectSettings() {
  if (!state.dir) return false;
  try {
    if (!(await ensurePerm(state.dir))) return false;
    const h = await state.dir.getFileHandle("projekt.json", { create: true });
    await writeHandle(h, JSON.stringify(settingsCfg, null, 2));
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
document.getElementById("btnLib").onclick = pickLibrary;

function isSheetActive() {
  return state.active && state.active !== state.lib && state.sheets.includes(state.active);
}
function selectSheetElement(el, opts) {
  const node = currentSymNode();
  if (!node || !el || el.parentNode !== node) return;
  const scroll = !(opts && opts.noScroll);
  clearConnLabelSel();
  state.selection = [el];
  state.activeEl = el;
  state.selHandle = null;
  clearSelInfo();
  highlightActive();
  syncElementListSelection();
  if (scroll && el._elemListItem) el._elemListItem.scrollIntoView({ block: "nearest" });
  setStatus("Zaznaczono: " + sheetElementListLabel(el, Array.prototype.indexOf.call(node.children, el)));
}
function selectSheetElements(els, opts) {
  const node = currentSymNode();
  if (!node) return;
  const list = (els || []).filter((el) => el && el.parentNode === node);
  if (!list.length) return;
  const scroll = !(opts && opts.noScroll);
  clearConnLabelSel();
  state.selection = list.slice();
  state.activeEl = list[0];
  state.selHandle = null;
  clearSelInfo();
  highlightActive();
  syncElementListSelection();
  if (scroll && state.activeEl._elemListItem) state.activeEl._elemListItem.scrollIntoView({ block: "nearest" });
  const ref = instanceRefOf(list[0]);
  setStatus(
    ref ? "Zaznaczono instancję " + ref + " (" + list.length + ")" : "Zaznaczono: " + list.length + " elementów"
  );
}
function instanceTexts(node, ref) {
  return qsaByOwnerRef(node, ref);
}
function instanceTextByLabel(node, ref, label) {
  return instanceTexts(node, ref).find((t) => (t.getAttribute("data-label") || "") === label) || null;
}
function ensureInstanceDesigLabel(use, ref) {
  const node = use?.parentNode;
  if (!node || !ref) return null;
  let lbl = instanceTextByLabel(node, ref, "desig");
  if (lbl) return lbl;
  const legacy = instanceTexts(node, ref).find((t) => {
    const role = (t.getAttribute("data-label") || "").trim();
    if (role === "desc") return false;
    const txt = (t.textContent || "").trim();
    return !role || txt === "-" + ref || txt === ref || !txt;
  });
  if (legacy) {
    legacy.setAttribute("data-label", "desig");
    return legacy;
  }
  lbl = mkEl("text", {
    x: num(use, "x") + 5,
    y: num(use, "y") - 5,
    class: "did",
    "data-owner-ref": ref,
    "data-label": "desig",
  });
  lbl.textContent = "-" + ref;
  styleText(lbl);
  node.appendChild(lbl);
  return lbl;
}
function ensureInstanceDescLabel(use, ref, text, { label = "desc", yOff = 18 } = {}) {
  const node = use?.parentNode;
  if (!node || !ref) return null;
  let lbl = instanceTextByLabel(node, ref, label);
  if (lbl) {
    if (text != null) lbl.textContent = text;
    return lbl;
  }
  const content = text != null ? String(text) : "";
  if (!content) return null;
  lbl = mkEl("text", {
    x: num(use, "x") + 5,
    y: num(use, "y") + yOff,
    class: "did",
    "data-owner-ref": ref,
    "data-label": label,
  });
  lbl.textContent = content;
  styleText(lbl);
  node.appendChild(lbl);
  return lbl;
}
function libSymbolNodeForUse(use) {
  const symId = (
    use?.getAttribute("data-sym") ||
    use?.getAttribute("href") ||
    (use?.getAttributeNS && use.getAttributeNS(XLINK, "href")) ||
    ""
  ).replace(/^#/, "");
  if (!symId || !state.lib?.svg) return null;
  return resolveLibSymbol(state.lib.svg, symId);
}
function libDescForUse(use) {
  const node = libSymbolNodeForUse(use);
  return node ? symbolDescription(node) : "";
}
function libDesc2ForUse(use) {
  const node = libSymbolNodeForUse(use);
  return node ? symbolDescription2(node) : "";
}
function selectionUseTarget() {
  return selectionInstanceUse(state.selection) || null;
}
function setInstanceRef(use, v, opts) {
  const node = use && use.parentNode;
  if (!node) return { ok: false, reason: "Brak elementu." };
  v = (v || "").trim().replace(/^-/, "");
  if (!v) return { ok: false, reason: "Oznaczenie instancji nie może być puste." };
  if (!isValidInstanceRef(v)) return { ok: false, reason: "Instancja: litery (w tym polskie), cyfry, _, -." };
  const oldRef = use.getAttribute("data-ref") || "";
  if (v === oldRef) return { ok: true, changed: false };
  const used = new Set(
    [...node.querySelectorAll("use[data-ref]")].map((u) => u.getAttribute("data-ref")).filter((r) => r && r !== oldRef)
  );
  if (used.has(v)) return { ok: false, reason: "Instancja " + v + " jest już na schemacie." };
  if (!(opts && opts.skipUndo)) pushUndo();
  use.setAttribute("data-ref", v);
  instanceTexts(node, oldRef).forEach((t) => {
    t.setAttribute("data-owner-ref", v);
    const role = (t.getAttribute("data-label") || "").trim();
    if (role === "desc" || role === "desc2") return;
    const txt = (t.textContent || "").trim();
    if (role === "desig" || !txt || txt === "-" + oldRef || txt === oldRef) {
      if (!role) t.setAttribute("data-label", "desig");
      t.textContent = "-" + v;
    }
  });
  [...node.querySelectorAll('[data-role="conn"][data-ref="' + oldRef + '"]')].forEach((c) =>
    c.setAttribute("data-ref", v)
  );
  return { ok: true, changed: true };
}
function selectionTextTarget() {
  return (
    connLabelEl() ||
    (state.activeEl && state.activeEl.tagName && state.activeEl.tagName.toLowerCase() === "text"
      ? state.activeEl
      : null)
  );
}
function fillSelPropSymOptions(symSel, currentId) {
  if (!symSel) return;
  let cur = currentId || "";
  if (cur && state.lib?.svg) {
    const resolved = resolveLibSymbol(state.lib.svg, cur);
    if (resolved) cur = resolved.id;
  }
  const ids = state.symbols.map((s) => s.id);
  if (cur && !ids.includes(cur)) ids.unshift(cur);
  const prev = symSel.value;
  symSel.innerHTML = "";
  ids.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    const node = state.lib?.svg ? resolveLibSymbol(state.lib.svg, id) : null;
    opt.textContent = node ? symbolCatalogLabel(node, id) : id;
    symSel.appendChild(opt);
  });
  if (cur && [...symSel.options].some((o) => o.value === cur)) symSel.value = cur;
  else if (prev && [...symSel.options].some((o) => o.value === prev)) symSel.value = prev;
}
function syncSelectionProps(mode) {
  const {
    refInp,
    numInp,
    pinInp,
    descInp,
    desc2Inp,
    textInp,
    lenInp,
    dirInp,
    symSel,
    netInp,
    wireInp,
    lengthInp,
    notesInp,
    refField,
    numField,
    pinField,
    descField,
    desc2Field,
    textField,
    lenField,
    dirField,
    symField,
    netField,
    wireField,
    lengthField,
    notesField,
  } = selectionPropsEls();
  const propsInputs = [
    refInp,
    numInp,
    pinInp,
    descInp,
    desc2Inp,
    textInp,
    lenInp,
    dirInp,
    symSel,
    netInp,
    wireInp,
    lengthInp,
    notesInp,
  ].filter(Boolean);
  const editing = propsInputs.some((inp) => document.activeElement === inp);
  if (!mode) {
    if (!editing) {
      if (refInp) refInp.value = "";
      if (numInp) numInp.value = "";
      if (pinInp) pinInp.value = "";
      if (descInp) descInp.value = "";
      if (desc2Inp) desc2Inp.value = "";
      if (textInp) textInp.value = "";
      if (lenInp) lenInp.value = "";
      if (netInp) netInp.value = "";
      if (wireInp) wireInp.value = "";
      if (lengthInp) lengthInp.value = "";
      if (notesInp) notesInp.value = "";
    }
    [refField, numField, pinField, descField, desc2Field, textField, lenField, dirField, symField].forEach(
      (f) => {
        if (f) f.classList.add("context-hidden");
      }
    );
    setConnectionPropsVisible({ netField, wireField, lengthField, notesField }, false);
    state._selPropTextEl = null;
    return;
  }
  const useEl = mode === "use" ? selectionUseTarget() : null;
  const el = mode === "use" ? useEl : state.selection.length === 1 ? state.selection[0] : null;
  const labelEl = connLabelEl();
  const refNow = useEl ? useEl.getAttribute("data-ref") || "" : "";
  const descLbl = mode === "use" && useEl?.parentNode ? instanceTextByLabel(useEl.parentNode, refNow, "desc") : null;
  const desc2Lbl = mode === "use" && useEl?.parentNode ? instanceTextByLabel(useEl.parentNode, refNow, "desc2") : null;
  const lead =
    mode === "conn" && el && typeof isConnLead === "function" && isConnLead(el)
      ? leadPropsFromConn(el, connParts(el), { num, fmt })
      : null;
  const st = readSelectionPropsState({
    mode,
    el,
    connLabelEl: labelEl,
    descText: descLbl ? descLbl.textContent || "" : useEl ? libDescForUse(useEl) : "",
    desc2Text: desc2Lbl ? desc2Lbl.textContent || "" : useEl ? libDesc2ForUse(useEl) : "",
    getHref: (node) => node.getAttribute("href") || node.getAttributeNS(XLINK, "href") || "",
    lead,
  });
  if (!editing) {
    if (mode === "use") {
      if (refInp) refInp.value = st.prefix;
      if (numInp) numInp.value = st.num;
      if (descInp) descInp.value = st.desc;
      if (desc2Inp) desc2Inp.value = st.desc2;
    } else if (refInp) refInp.value = st.ref;
    if (pinInp) pinInp.value = st.pin;
    if (textInp) textInp.value = st.text;
    if (lenInp) lenInp.value = st.len;
    if (dirInp && st.dir) dirInp.value = st.dir;
    if (mode === "wire") {
      if (netInp) netInp.value = st.net;
      if (wireInp) wireInp.value = st.wire;
      if (lengthInp) lengthInp.value = st.length;
      if (notesInp) notesInp.value = st.notes;
    }
    if (mode === "use") fillSelPropSymOptions(symSel, st.symId);
  } else if (mode === "use" && symSel && !symSel.options.length) {
    fillSelPropSymOptions(symSel, st.symId);
  }
  if (refField) refField.classList.toggle("context-hidden", mode !== "use" && mode !== "conn");
  if (numField) numField.classList.toggle("context-hidden", mode !== "use");
  if (pinField) pinField.classList.toggle("context-hidden", mode !== "conn");
  if (lenField) lenField.classList.toggle("context-hidden", !(mode === "conn" && st.isLead));
  if (dirField) dirField.classList.toggle("context-hidden", !(mode === "conn" && st.isLead));
  if (descField) descField.classList.toggle("context-hidden", mode !== "use");
  if (desc2Field) desc2Field.classList.toggle("context-hidden", mode !== "use");
  if (textField) textField.classList.toggle("context-hidden", mode !== "text");
  if (symField) symField.classList.toggle("context-hidden", mode !== "use");
  setConnectionPropsVisible(
    { netField, wireField, lengthField, notesField },
    mode === "wire"
  );
  if (mode === "text") state._selPropTextEl = selectionTextTarget();
  else state._selPropTextEl = null;
}
function focusSelectionPropsField(mode, opts) {
  const id = selectionPropsFocusField(mode, opts);
  if (!id) return;
  syncToolbarContext();
  requestAnimationFrame(() => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.focus();
    if (typeof inp.select === "function") inp.select();
  });
}
async function promoteToLibrary(kind, value, useEl) {
  const symId = (
    useEl.getAttribute("data-sym") ||
    useEl.getAttribute("href") ||
    useEl.getAttributeNS(XLINK, "href") ||
    ""
  ).replace(/^#/, "");
  if (!symId || !state.lib?.svg) {
    setStatus(status.symbolMissing(symId || "?"));
    return false;
  }
  const node = resolveLibSymbol(state.lib.svg, symId);
  if (!node) {
    setStatus(status.symbolMissing(symId));
    return false;
  }
  if (kind === "prefix") {
    const prefix = String(value || "")
      .trim()
      .replace(/^-/, "");
    if (!prefix || !isValidInstanceRef(prefix)) {
      setStatus(status.symbolInvalidDesignation);
      return false;
    }
    node.setAttribute("data-inst-prefix", prefix);
  } else if (kind === "desc") {
    const desc = String(value || "").trim();
    if (desc) node.setAttribute(SYMBOL_DESC_ATTR, desc);
    else node.removeAttribute(SYMBOL_DESC_ATTR);
  } else if (kind === "desc2") {
    const desc2 = String(value || "").trim();
    if (desc2) node.setAttribute(SYMBOL_DESC2_ATTR, desc2);
    else node.removeAttribute(SYMBOL_DESC2_ATTR);
  }
  markSheetDirty(state.lib);
  buildSymbolList();
  syncListSelection();
  return true;
}

async function commitSelectionProps() {
  const onSheet = !!(state.active && state.active !== state.lib);
  const mode = resolveSelectionPropsMode({
    onSheet,
    selection: state.selection,
    connLabelSel: state.connLabelSel,
  });
  if (!mode) return;
  const {
    refInp,
    numInp,
    pinInp,
    descInp,
    desc2Inp,
    textInp,
    lenInp,
    dirInp,
    symSel,
    netInp,
    wireInp,
    lengthInp,
    notesInp,
  } = selectionPropsEls();

  if (mode === "wire") {
    const el = state.selection[0];
    if (!el) return;
    const connId = wireConnId(el);
    const nextNet = ((netInp && netInp.value) || "").trim() || "—";
    const nextWire = ((wireInp && wireInp.value) || "").trim();
    const nextLength = ((lengthInp && lengthInp.value) || "").trim();
    const nextNotes = ((notesInp && notesInp.value) || "").trim();
    const prevNet = (el.getAttribute("data-net") || "").trim();
    const prevWire = (el.getAttribute("data-wire") || "").trim();
    const prevLength = (el.getAttribute("data-length") || "").trim();
    const prevNotes = (el.getAttribute("data-notes") || "").trim();
    if (
      nextNet === (prevNet || "—") &&
      nextWire === prevWire &&
      nextLength === prevLength &&
      nextNotes === prevNotes
    ) {
      return;
    }
    pushUndo();
    const existing = state.netlist?.connections?.find((c) => c.id === connId);
    const record = NetlistModel.normalizeConnection({
      ...(existing || { id: connId, from: el.getAttribute("data-from"), to: el.getAttribute("data-to") }),
      net: nextNet,
      wire: nextWire || existing?.wire || "do ustalenia",
      length: nextLength,
      notes: nextNotes,
    });
    applyConnectionRecord(record, {
      el,
      routeKind: el.getAttribute("data-route") || "manual",
      strokeWidth: state.routeOpts?.strokeWidth || "",
      persist: true,
      upsert: !!existing || !!connId,
    });
    markActiveDirty();
    render();
    buildElementList();
    syncElementListSelection();
    syncSelectionProps("wire");
    if (typeof refreshNetlistUI === "function") refreshNetlistUI();
    setStatus("Zaktualizowano opis połączenia" + (connId ? " " + connId : "") + ".", {
      toast: true,
      tone: "success",
    });
    saveProject();
    return;
  }

  if (mode === "text") {
    const textEl = selectionTextTarget();
    if (!textEl || !textInp) return;
    const next = textInp.value;
    if (next === textEl.textContent) {
      if (isConnLabelMode()) updateConnLabel(state.connLabelSel);
      render();
      return;
    }
    if (!state._selPropUndoPushed) pushUndo();
    textEl.textContent = next;
    if (isConnLabelMode()) {
      state.connLabelSel.setAttribute("data-pin", next);
      updateConnLabel(state.connLabelSel);
    }
    markActiveDirty();
    render();
    buildElementList();
    syncElementListSelection();
    syncSelectionProps("text");
    setStatus(status.selectionText(next));
    saveProject();
    state._selPropUndoPushed = false;
    state._selPropOrig = null;
    return;
  }

  if (mode === "use") {
    const el = selectionUseTarget();
    if (!el) return;
    const curRef = (el.getAttribute("data-ref") || "").trim();
    const curParts = splitInstanceRef(curRef);
    const nextPrefix = ((refInp && refInp.value) || "").trim().replace(/^-/, "");
    const nextNum = ((numInp && numInp.value) || "").trim().replace(/[^\d]/g, "");
    const nextRef = joinInstanceRef(nextPrefix, nextNum || curParts.num);
    const descLbl = el.parentNode ? instanceTextByLabel(el.parentNode, curRef, "desc") : null;
    const desc2Lbl = el.parentNode ? instanceTextByLabel(el.parentNode, curRef, "desc2") : null;
    const prevDesc = (
      el.getAttribute("data-inst-desc") ||
      (descLbl ? descLbl.textContent : "") ||
      libDescForUse(el) ||
      ""
    ).trim();
    const prevDesc2 = (
      el.getAttribute("data-inst-desc2") ||
      (desc2Lbl ? desc2Lbl.textContent : "") ||
      libDesc2ForUse(el) ||
      ""
    ).trim();
    const nextDesc = descInp ? descInp.value.trim() : prevDesc;
    const nextDesc2 = desc2Inp ? desc2Inp.value.trim() : prevDesc2;
    const prefixChanged = nextPrefix !== curParts.prefix;
    const numChanged = (nextNum || "") !== (curParts.num || "");
    const descChanged = nextDesc !== prevDesc;
    const desc2Changed = nextDesc2 !== prevDesc2;
    const metaChanged = prefixChanged || descChanged || desc2Changed;

    if (metaChanged) {
      const msg = prefixChanged ? W.choice.promotePrefix : W.choice.promoteDesc;
      const choice = await askChoice(msg, { title: W.dialog.promoteScope });
      if (choice === "cancel") {
        syncSelectionProps("use");
        return;
      }
      let changed = false;
      if (nextRef !== curRef) {
        const res = setInstanceRef(el, nextRef);
        if (!res.ok) {
          setStatus(res.reason || status.instanceRefFailed);
          syncSelectionProps("use");
          return;
        }
        if (res.changed) changed = true;
      } else if (!state._selPropUndoPushed) {
        pushUndo();
      }
      const refNow = (el.getAttribute("data-ref") || nextRef).trim();
      ensureInstanceDesigLabel(el, refNow);
      if (descChanged) {
        if (nextDesc) {
          el.setAttribute("data-inst-desc", nextDesc);
          ensureInstanceDescLabel(el, refNow, nextDesc, { label: "desc", yOff: 18 });
        } else {
          el.removeAttribute("data-inst-desc");
          const d = instanceTextByLabel(el.parentNode, refNow, "desc");
          if (d) d.remove();
        }
        changed = true;
      }
      if (desc2Changed) {
        if (nextDesc2) {
          el.setAttribute("data-inst-desc2", nextDesc2);
          ensureInstanceDescLabel(el, refNow, nextDesc2, { label: "desc2", yOff: 30 });
        } else {
          el.removeAttribute("data-inst-desc2");
          const d = instanceTextByLabel(el.parentNode, refNow, "desc2");
          if (d) d.remove();
        }
        changed = true;
      }
      if (choice === "library") {
        if (prefixChanged) await promoteToLibrary("prefix", nextPrefix, el);
        if (descChanged) await promoteToLibrary("desc", nextDesc, el);
        if (desc2Changed) await promoteToLibrary("desc2", nextDesc2, el);
        setStatus(status.instanceRefSet(refNow));
      } else if (changed || prefixChanged || numChanged) {
        setStatus(status.instanceRefSet(refNow));
      }
      const nextSym = ((symSel && symSel.value) || "").trim();
      const curSym = (
        el.getAttribute("data-sym") ||
        el.getAttribute("href") ||
        el.getAttributeNS(XLINK, "href") ||
        ""
      ).replace(/^#/, "");
      if (nextSym && nextSym !== curSym) {
        if (!state.lib || !resolveLibSymbol(state.lib.svg, nextSym)) {
          setStatus(status.symbolMissing(nextSym));
          if (symSel) symSel.value = curSym;
        } else {
          if (!changed) pushUndo();
          setUseHref(el, nextSym, XLINK);
          changed = true;
          setStatus(status.symbolSwapped(nextSym));
        }
      }
      if (changed || choice === "library") {
        markActiveDirty();
        if (el.parentNode) state.selection = expandToInstanceMembers(el.parentNode, [el]);
        render();
        buildElementList();
        syncElementListSelection();
        syncSelectionProps("use");
        saveProject();
      }
      state._selPropUndoPushed = false;
      state._selPropOrig = null;
      return;
    }

    let changed = false;
    if (numChanged || nextRef !== curRef) {
      const res = setInstanceRef(el, nextRef || curRef);
      if (!res.ok) {
        setStatus(res.reason || status.instanceRefFailed);
        syncSelectionProps("use");
        return;
      }
      if (res.changed) {
        changed = true;
        ensureInstanceDesigLabel(el, el.getAttribute("data-ref") || nextRef);
        setStatus(status.instanceRefSet(el.getAttribute("data-ref") || ""));
      }
    }
    const nextSym = ((symSel && symSel.value) || "").trim();
    const curSym = (
      el.getAttribute("data-sym") ||
      el.getAttribute("href") ||
      el.getAttributeNS(XLINK, "href") ||
      ""
    ).replace(/^#/, "");
    if (nextSym && nextSym !== curSym) {
      if (!state.lib || !resolveLibSymbol(state.lib.svg, nextSym)) {
        setStatus(status.symbolMissing(nextSym));
        if (symSel) symSel.value = curSym;
        return;
      }
      if (!changed) pushUndo();
      setUseHref(el, nextSym, XLINK);
      changed = true;
      setStatus(status.symbolSwapped(nextSym));
    }
    if (changed) {
      markActiveDirty();
      if (el.parentNode) state.selection = expandToInstanceMembers(el.parentNode, [el]);
      render();
      buildElementList();
      syncElementListSelection();
      syncSelectionProps("use");
      saveProject();
    }
    state._selPropUndoPushed = false;
    state._selPropOrig = null;
    return;
  }

  const el = state.selection[0];
  if (!el) return;
  // conn
  const ref = ((refInp && refInp.value) || "").trim().replace(/^-/, "");
  const pin = ((pinInp && pinInp.value) || "").trim();
  if (!pin) {
    setStatus(status.pinEmpty);
    if (pinInp) pinInp.value = el.getAttribute("data-pin") || "";
    return;
  }
  if (!ref) {
    setStatus(status.refEmpty);
    if (refInp) refInp.value = el.getAttribute("data-ref") || "";
    return;
  }
  const oldRef = el.getAttribute("data-ref") || "";
  const oldPin = el.getAttribute("data-pin") || "";
  const isLead = typeof isConnLead === "function" && isConnLead(el);
  let lenChanged = false,
    dirChanged = false;
  let nextLen = null,
    nextDir = null;
  if (isLead) {
    const lead = leadPropsFromConn(el, connParts(el), { num, fmt });
    nextLen = Math.max(state.step, parseFloat(lenInp && lenInp.value) || 0);
    nextDir = ((dirInp && dirInp.value) || lead?.dir || "E").trim().toUpperCase();
    if (!["N", "E", "S", "W"].includes(nextDir)) {
      setStatus(status.leadDirInvalid);
      return;
    }
    const oldLen = lead ? parseFloat(lead.len) : NaN;
    lenChanged = !isFinite(oldLen) || Math.abs(oldLen - nextLen) > 1e-6;
    dirChanged = (lead?.dir || "") !== nextDir;
  }
  if (ref === oldRef && pin === oldPin && !lenChanged && !dirChanged) return;
  pushUndo();
  el.setAttribute("data-ref", ref);
  el.setAttribute("data-pin", pin);
  if (isLead && (lenChanged || dirChanged)) {
    const p = connParts(el);
    const v = connDirVector(nextDir);
    el.setAttribute("data-dir", nextDir);
    el.setAttribute("data-len", fmt(nextLen));
    setConnOuter(el, num(p.stub, "x1") + v[0] * nextLen, num(p.stub, "y1") + v[1] * nextLen);
    syncConnJointAnchor(el);
  }
  updateConnLabel(el);
  if (isConnPoint(el)) applyConnStyle(el);
  else if (!isLead) syncConnJointAnchor(el);
  markActiveDirty();
  render();
  buildElementList();
  syncElementListSelection();
  syncSelectionProps("conn");
  setStatus(status.connMeta(ref, pin));
  saveProject();
}
function initSelectionPropsForm() {
  applyConnectionFieldLabels(document);
  const {
    refInp,
    numInp,
    pinInp,
    descInp,
    desc2Inp,
    textInp,
    lenInp,
    dirInp,
    symSel,
    netInp,
    wireInp,
    lengthInp,
    notesInp,
  } = selectionPropsEls();
  const wireCommit = (inp) => {
    if (!inp) return;
    inp.addEventListener("focus", () => {
      if (inp === textInp) {
        const el = selectionTextTarget();
        state._selPropTextEl = el;
        state._selPropOrig = el ? el.textContent : "";
        if (el && !state._selPropUndoPushed) {
          pushUndo();
          state._selPropUndoPushed = true;
        }
      } else {
        state._selPropOrig = inp.value;
      }
    });
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commitSelectionProps();
        inp.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (inp === textInp && state._selPropTextEl && state._selPropOrig != null) {
          state._selPropTextEl.textContent = state._selPropOrig;
          if (isConnLabelMode()) state.connLabelSel.setAttribute("data-pin", state._selPropOrig);
          inp.value = state._selPropOrig;
          render();
        } else if (state._selPropOrig != null) {
          inp.value = state._selPropOrig;
        }
        state._selPropUndoPushed = false;
        inp.blur();
      }
    });
    if (inp === textInp) {
      inp.addEventListener("input", () => {
        const el = state._selPropTextEl || selectionTextTarget();
        if (!el) return;
        el.textContent = inp.value;
        if (isConnLabelMode()) state.connLabelSel.setAttribute("data-pin", inp.value);
        updateHostOnly();
        highlightActive();
        markActiveDirty();
      });
    }
    inp.addEventListener("change", () => {
      commitSelectionProps();
    });
  };
  wireCommit(refInp);
  wireCommit(numInp);
  wireCommit(pinInp);
  wireCommit(descInp);
  wireCommit(desc2Inp);
  wireCommit(textInp);
  wireCommit(lenInp);
  wireCommit(dirInp);
  wireCommit(symSel);
  wireCommit(netInp);
  wireCommit(wireInp);
  wireCommit(lengthInp);
  wireCommit(notesInp);
}

function initRouteOptsUi() {
  bindRouteOptsUi(state);
}

function initWireMarkModeUi() {
  const sel = document.getElementById("wireMarkMode");
  if (!sel) return;
  sel.value = normalizeWireMarkMode(state.wireMarkMode);
  sel.onchange = () => {
    state.wireMarkMode = normalizeWireMarkMode(sel.value);
    sel.value = state.wireMarkMode;
    savePrefs();
    const node = currentSymNode();
    if (node) ensureSheetWireMarks(node);
    if (node && scene?.host) rebuildHost(scene.host);
  };
}
/* buildSymbolList / buildElementList / sync* — createSidebarLists (wireSidebarLists) */

// ---- wybór celu + render ----
function migrateSheetSemantics(sheet) {
  if (!sheet || sheet === state.lib) return;
  const node = sheet.svg.querySelector('[id="' + sheet.id + '"]');
  if (!node) return;
  const texts = [...node.children].filter((el) => el.tagName && el.tagName.toLowerCase() === "text");
  const labels = texts
    .map((el) => {
      const m = (el.textContent || "").trim().match(/^-([A-Z]{1,4}\d*)$/);
      return m ? { el, ref: m[1], x: num(el, "x"), y: num(el, "y") } : null;
    })
    .filter(Boolean);
  [...node.children]
    .filter((el) => el.tagName && el.tagName.toLowerCase() === "use" && !el.getAttribute("data-ref"))
    .forEach((use) => {
      const x = num(use, "x"),
        y = num(use, "y");
      let best = null,
        dist = 150;
      labels.forEach((l) => {
        const d = Math.hypot(l.x - x, l.y - y);
        if (d < dist) {
          dist = d;
          best = l;
        }
      });
      if (best) {
        use.setAttribute("data-ref", best.ref);
        use.setAttribute(
          "data-sym",
          (use.getAttribute("href") || use.getAttributeNS(XLINK, "href") || "").replace(/^#/, "")
        );
        best.el.setAttribute("data-owner-ref", best.ref);
      }
    });
  texts.forEach((text) => {
    const m = (text.textContent || "").trim().match(/^-?(X\d+):([A-Za-z0-9+._-]+)$/);
    if (!m) return;
    if (node.querySelector('[data-role="conn"][data-ref="' + m[1] + '"][data-pin="' + m[2] + '"]')) return;
    const x = num(text, "x") - 5,
      y = num(text, "y") - 2.5,
      g = mkConn({ kind: "lead", ix: x - 10, iy: y, ox: x, oy: y, pin: m[2], ref: m[1] });
    const p = connParts(g);
    p.stub.setAttribute("stroke", "none");
    p.label.setAttribute("opacity", "0");
    node.appendChild(g);
  });
}
function activateTarget(target, id, keepView) {
  const prevActive = state.active;
  clearConnLabelSel();
  if (target !== state.lib) migrateSheetSemantics(target);
  state.active = target;
  state.srcSvg = target.svg;
  state.srcDoc = target.doc;
  state.fileName = target.name;
  if (target !== state.lib) state.lastSheet = target;
  if (state.active !== prevActive) {
    state.undo = [];
    state.redo = [];
  }
  state.selId = id;
  state.selHandle = null;
  state.activeEl = null;
  state.selection = [];
  clearSelInfo();
  syncNameFields();
  syncListSelection();
  render();
  syncToolbarContext();
  if (state.netlist) scheduleNetlistRefresh();
  if (keepView) applyView();
  else fitView();
  savePrefs();
}
function selectSheet(sheet, keepView) {
  if (!sheet || state.sheets.indexOf(sheet) < 0) return;
  activateTarget(sheet, sheet.id, keepView);
  if (state.dir) {
    autoLoadNetlistForSheet(sheet, state.dir, { silent: true }).then((ok) => {
      if (state.active !== sheet) return;
      const title = sheetDisplayTitle(sheet);
      if (ok && state.netlist)
        setStatus(
          "Schemat " + title + ", spis: " + (state.netlist.connections?.length || 0) + " po\u0142\u0105cze\u0144."
        );
      else setStatus("Schemat " + title + " \u2014 brak połączeń (dodaj w edytorze spisu).");
    });
  }
}
function selectSymbol(id, keepView) {
  if (!id) return;
  if (state.symbols.some((s) => s.id === id)) {
    ensureLib();
    activateTarget(state.lib, id, keepView);
    return;
  }
  const sheet = findSheetByKey(state.sheets, id) || state.sheets.find((s) => s.id === id);
  if (sheet) {
    selectSheet(sheet, keepView);
    return;
  }
  ensureLib();
  if (resolveLibSymbol(state.lib?.svg, id)) activateTarget(state.lib, id, keepView);
}
function currentSymNode() {
  if (!state.srcSvg || !state.selId) return null;
  if (state.active === state.lib) return resolveLibSymbol(state.lib?.svg, state.selId);
  return qsById(state.srcSvg, state.selId);
}

/** SSOT: nadruki na wszystkich trasach arkusza (przed klonem do hosta). */
function ensureSheetWireMarks(node) {
  if (!node || state.active === state.lib) return;
  const byId = new Map((state.netlist?.connections || []).map((c) => [String(c.id), c]));
  resyncAllWireMarks(node, state.wireMarkMode, mkEl, {
    resolveRecord: (id) => byId.get(String(id)) || null,
    endpointRaw: (ep) => NetlistModel.endpointRaw(ep),
  });
}

/** SSOT: opisy instancji (desig/desc/pin) zawsze czytelne (kąt 0°). */
function ensureInstanceLabelAngles(node) {
  if (!node || state.active === state.lib) return;
  syncAllInstanceLabelAngles(node, typeof connParts === "function" ? { connParts } : {});
}

/** SSOT: numery styków z defs jako osobne napisy na arkuszu (bez rotate/scale use). */
function ensureInstancePinLabels(node) {
  if (!node || state.active === state.lib) return;
  syncInstancePinLabels(node, {
    definitionForUse: (use) => definitionForUseElement(use, state.lib?.svg, state.srcSvg, XLINK),
    mkEl,
    styleText,
  });
}

function render() {
  const missing = rebuildEditDefs(scene.defs).missing;
  if (missing.length) console.warn("Brak symboli w podglądzie:", missing.join(", "));
  const node = currentSymNode();
  if (!node) {
    scene.host.innerHTML = "";
    buildElementList();
    syncSelectionToolbar();
    markDirty();
    scheduleNetlistRefresh();
    return;
  }
  ensureSheetWireMarks(node);
  ensureInstancePinLabels(node);
  ensureInstanceLabelAngles(node);
  rebuildHost(scene.host);
  buildHandles(node);
  attachBodyHandlers();
  buildElementList();
  highlightActive();
  markDirty();
  scheduleNetlistRefresh();
}
function attachBodyHandlers() {
  const root = scene.hostRoot;
  if (!root) return;
  const node = currentSymNode();
  if (!node) return;
  [...root.children].forEach((cel, i) => {
    const src = node.children[i];
    cel.style.cursor = "move";
    const labelCel = isConnGroup(src) ? cel.querySelector('[data-part="label"]') : null;
    if (labelCel) {
      labelCel.style.cursor = "move";
      labelCel.addEventListener("pointerdown", (ev) => startConnLabelDrag(ev, src, i, labelCel));
      labelCel.addEventListener("dblclick", (ev) => {
        if (state.drawMode) return;
        ev.stopPropagation();
        ev.preventDefault();
        selectConnLabel(src);
        highlightActive();
        focusSelectionPropsField("text");
      });
    }
    cel.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest && ev.target.closest('[data-part="label"]') && isConnGroup(src)) return;
      clearConnLabelSel();
      startBodyDrag(ev, cel, i);
    });
    cel.addEventListener("dblclick", (ev) => {
      if (state.drawMode) return;
      ev.stopPropagation();
      ev.preventDefault();
      const n = currentSymNode();
      if (!n) return;
      const el = n.children[i];
      const tag = el?.tagName?.toLowerCase?.() || "";
      if (tag === "line" || tag === "polyline") {
        const world = toWorld(ev);
        if (insertBreakPointAt(el, world.x, world.y)) return;
      }
      editElement(el);
    });
  });
}
function startConnLabelDrag(ev, conn, i, labelCel) {
  if (state.drawMode) return;
  resetRotationSession();
  ev.stopPropagation();
  ev.preventDefault();
  selectConnLabel(conn);
  clearSelInfo();
  highlightActive();
  pushUndo();
  const start = toWorld(ev);
  bodyDrag = {
    labelOnly: true,
    conn,
    label: connParts(conn).label,
    cel: labelCel,
    baseTransform: labelCel.getAttribute("transform") || "",
    sx: start.x,
    sy: start.y,
    dx: 0,
    dy: 0,
  };
  captureStagePointer(ev);
}
function editElement(el) {
  if (!el) {
    return;
  }
  const t = el.tagName.toLowerCase();
  if (isConnGroup(el)) {
    clearConnLabelSel();
    state.selection = [el];
    state.activeEl = el;
    state.selHandle = null;
    highlightActive();
    focusSelectionPropsField("conn", { isLead: isConnLead(el) });
    return;
  } else if (t === "text") {
    clearConnLabelSel();
    state.selection = [el];
    state.activeEl = el;
    state.selHandle = null;
    highlightActive();
    focusSelectionPropsField("text");
    return;
  } else if (t === "use") {
    clearConnLabelSel();
    state.selection = [el];
    state.activeEl = el;
    state.selHandle = null;
    highlightActive();
    focusSelectionPropsField("use");
  } else if (t === "line" || t === "polyline") {
    setStatus("Trasa: przeciągaj uchwyty · podwójny klik = dodaj punkt · Delete/Alt+klik = usuń punkt łamania.");
  } else {
    setStatus(status.editWithHandles);
  }
}
function setPositionedElement(el, x, y) {
  resetRotationSession();
  const ox = num(el, "x"),
    oy = num(el, "y"),
    dataAng = el.getAttribute("data-ang");
  const rot = dataAng === null ? simpleRotation(el) : null;
  const nx = fmt(x),
    ny = fmt(y);
  el.setAttribute("x", nx);
  el.setAttribute("y", ny);
  if (el.tagName?.toLowerCase() === "use" && dataAng !== null) {
    writeUseOrient(el, readUseOrient(el), x, y);
    return;
  }
  if (dataAng !== null) el.setAttribute("transform", `rotate(${dataAng} ${nx} ${ny})`);
  else if (rot) el.setAttribute("transform", `rotate(${fmt(rot.ang)} ${fmt(rot.cx + x - ox)} ${fmt(rot.cy + y - oy)})`);
}
function moveElement(el, dx, dy) {
  resetRotationSession();
  if (isConnLabelMode() && el === state.connLabelSel) {
    moveConnLabel(el, dx, dy);
    return;
  }
  const t = el.tagName.toLowerCase();
  const g = (a) => num(el, a);
  if (isConnGroup(el)) {
    moveConn(el, dx, dy);
    return;
  }
  const rot = t === "text" || t === "use" ? null : simpleRotation(el);
  if (t === "line") {
    el.setAttribute("x1", fmt(g("x1") + dx));
    el.setAttribute("y1", fmt(g("y1") + dy));
    el.setAttribute("x2", fmt(g("x2") + dx));
    el.setAttribute("y2", fmt(g("y2") + dy));
  } else if (t === "rect") {
    el.setAttribute("x", fmt(g("x") + dx));
    el.setAttribute("y", fmt(g("y") + dy));
  } else if (t === "circle") {
    el.setAttribute("cx", fmt(g("cx") + dx));
    el.setAttribute("cy", fmt(g("cy") + dy));
  } else if (t === "text") {
    setPositionedElement(el, g("x") + dx, g("y") + dy);
    if ((dx || dy) && isSheetPinLabel(el)) {
      const ref = (el.getAttribute("data-owner-ref") || "").trim();
      const use = findUseByRef(el.parentNode, ref);
      if (use) markSheetPinLabelManual(el, use);
    }
  } else if (t === "use") {
    setPositionedElement(el, g("x") + dx, g("y") + dy);
    // Złącza jedź z symbolem; etykiety (desig/desc) przesuwaj osobno w ramach grupy.
    const ref = el.getAttribute("data-ref"),
      node = currentSymNode();
    if (ref && node) {
      collectInstanceMembers(node, ref).forEach((m) => {
        if (m === el || state.selection.indexOf(m) >= 0) return;
        if (isConnGroup(m)) moveConn(m, dx, dy);
      });
    }
  } else if (t === "polyline" || t === "polygon") {
    const a = parsePoints(el).map((p) => [p[0] + dx, p[1] + dy]);
    el.setAttribute("points", a.map((q) => q.join(",")).join(" "));
  } else if (t === "path") {
    const segs = parsePathAbs(el.getAttribute("d") || "");
    segs.forEach((s) =>
      s.pts.forEach((p) => {
        p.x += dx;
        p.y += dy;
      })
    );
    el.setAttribute("d", buildD(segs));
  }
  if (rot) el.setAttribute("transform", `rotate(${fmt(rot.ang)} ${fmt(rot.cx + dx)} ${fmt(rot.cy + dy)})`);
}
let bodyDrag = null;
function captureStagePointer(ev) {
  try {
    stage.setPointerCapture(ev.pointerId);
  } catch (e) {}
}
function setBreakEditMode(on) {
  state.breakEditMode = !!on;
  const btn = document.getElementById("btnBreakPoint");
  if (btn) btn.classList.toggle("primary", state.breakEditMode);
  if (state.breakEditMode) {
    setStatus("Kliknij na trasę, aby dodać punkt łamania. Esc = anuluj.", {
      toast: true,
      tone: "info",
    });
  }
}

function toggleBreakEditMode() {
  if (state.drawMode) return;
  setBreakEditMode(!state.breakEditMode);
}

function startBodyDrag(ev, cel, i) {
  if (state.drawMode) return; // w trybie rysowania klik dodaje punkt (obsługa na scenie)
  resetRotationSession();
  if (ev.target.classList && ev.target.classList.contains("hnd")) return;
  ev.stopPropagation();
  ev.preventDefault();
  clearConnLabelSel();
  const node = currentSymNode();
  if (!node) return;
  const el = node.children[i];
  if (!el) return;
  if (state.breakEditMode) {
    const tag = el.tagName?.toLowerCase?.() || "";
    if (tag === "line" || tag === "polyline") {
      const world = toWorld(ev);
      if (insertBreakPointAt(el, world.x, world.y)) {
        setBreakEditMode(false);
        return;
      }
      setStatus("Kliknij bliżej odcinka trasy.", { toast: true, tone: "warning" });
      return;
    }
    setStatus("Zaznacz linię lub łamaną (trasę).", { toast: true, tone: "warning" });
    return;
  }
  if (ev.ctrlKey || ev.metaKey) {
    const k = state.selection.indexOf(el);
    if (k >= 0) {
      state.selection.splice(k, 1);
      if (state.activeEl === el) state.activeEl = state.selection[state.selection.length - 1] || null;
    } else {
      state.selection.push(el);
      state.activeEl = el;
    }
    state.selHandle = null;
    clearSelInfo();
    highlightActive();
    return; // Ctrl = tylko przełącz zaznaczenie, bez przesuwania
  }
  // Klik w członka instancji zaznacza tylko jego (symbol i tekst da się przesuwać osobno).
  // Jeśli już jest w multi-select — przeciągamy aktualne zaznaczenie bez rozszerzania.
  const inMulti = state.selection.length > 1 && state.selection.indexOf(el) >= 0;
  if (!inMulti) {
    state.selection = [el];
  }
  state.activeEl = el;
  state.selHandle = null;
  clearSelInfo();
  highlightActive();
  if (typeof selectConnectionFromElement === "function") selectConnectionFromElement(el);
  if (typeof refreshNetlistUI === "function") refreshNetlistUI();
  pushUndo();
  const start = toWorld(ev);
  const root = scene.hostRoot;
  const els = state.selection.slice();
  const previews = els
    .map((se) => {
      const idx = Array.prototype.indexOf.call(node.children, se);
      const cel = root ? root.children[idx] : null;
      return cel ? { cel, baseTransform: cel.getAttribute("transform") || "" } : null;
    })
    .filter(Boolean);
  bodyDrag = { els, previews, sx: start.x, sy: start.y, dx: 0, dy: 0 };
  captureStagePointer(ev);
}

// ---- uchwyty ----

function buildHandles(sym) {
  state.handles = [];
  state.pathSegs = new Map();
  for (const el of sym.children) {
    const t = el.tagName.toLowerCase();
    if (isConnGroup(el)) buildConnHandles(el);
    else if (t === "line") {
      state.handles.push(
        mkHandle(
          () => [num(el, "x1"), num(el, "y1")],
          (x, y) => {
            el.setAttribute("x1", x);
            el.setAttribute("y1", y);
          },
          "pt",
          el
        )
      );
      state.handles.push(
        mkHandle(
          () => [num(el, "x2"), num(el, "y2")],
          (x, y) => {
            el.setAttribute("x2", x);
            el.setAttribute("y2", y);
          },
          "pt",
          el
        )
      );
    } else if (t === "rect") {
      for (let i = 0; i < 4; i++) {
        const idx = i;
        state.handles.push(
          mkHandle(
            () => rectCorner(el, idx, num),
            (x, y) => setRectCorner(el, idx, x, y, num),
            "pt",
            el
          )
        );
      }
    } else if (t === "circle") {
      state.handles.push(
        mkHandle(
          () => [num(el, "cx"), num(el, "cy")],
          (x, y) => {
            el.setAttribute("cx", x);
            el.setAttribute("cy", y);
          },
          "pt",
          el
        )
      );
      state.handles.push(
        mkHandle(
          () => [num(el, "cx") + num(el, "r"), num(el, "cy")],
          (x, y) => {
            const cx = num(el, "cx"),
              cy = num(el, "cy");
            el.setAttribute("r", Math.max(0.5, Math.hypot(x - cx, y - cy)).toFixed(2));
          },
          "pt",
          el
        )
      );
    } else if (t === "text") {
      state.handles.push(
        mkHandle(
          () => [num(el, "x"), num(el, "y")],
          (x, y) => {
            setPositionedElement(el, x, y);
            if (isSheetPinLabel(el)) {
              const use = findUseByRef(el.parentNode, (el.getAttribute("data-owner-ref") || "").trim());
              if (use) markSheetPinLabelManual(el, use);
            }
          },
          "pt",
          el
        )
      );
    } else if (t === "use") {
      state.handles.push(
        mkHandle(
          () => [num(el, "x"), num(el, "y")],
          (x, y) => {
            const ox = num(el, "x"),
              oy = num(el, "y"),
              dx = x - ox,
              dy = y - oy;
            if (!dx && !dy) return;
            const node = currentSymNode();
            const ref = (el.getAttribute("data-ref") || "").trim();
            const members = ref && node ? collectInstanceMembers(node, ref) : [el];
            members.forEach((m) => {
              if (m === el) setPositionedElement(el, x, y);
              else if (m.tagName && m.tagName.toLowerCase() === "text")
                setPositionedElement(m, num(m, "x") + dx, num(m, "y") + dy);
              else if (isConnGroup(m)) moveConn(m, dx, dy);
            });
          },
          "pt",
          el
        )
      );
    } else if (t === "polyline" || t === "polygon") {
      const pts = parsePoints(el);
      const isConnWire = !!(
        el.getAttribute("data-conn-id") &&
        (el.getAttribute("data-from") || el.getAttribute("data-to"))
      );
      pts.forEach((p, i) => {
        const isEnd = i === 0 || i === pts.length - 1;
        const stickyEnd = isConnWire && isEnd ? (i === 0 ? "start" : "end") : null;
        const h = mkHandle(
          () => parsePoints(el)[i],
          (x, y) => {
            const a = parsePoints(el);
            if (stickyEnd) {
              const j = typeof nearestJoint === "function" ? nearestJoint(x, y) : null;
              if (j) {
                x = j.x;
                y = j.y;
                const raw = endpointRawFromSnap(j);
                if (raw) {
                  const startIsFrom = wireStartIsFrom(el);
                  if (stickyEnd === "start") el.setAttribute(startIsFrom ? "data-from" : "data-to", raw);
                  else el.setAttribute(startIsFrom ? "data-to" : "data-from", raw);
                }
              }
            }
            a[i] = [x, y];
            el.setAttribute("points", a.map((q) => q.join(",")).join(" "));
            if (el.getAttribute("data-conn-id")) {
              el.setAttribute("data-route", "manual");
              if (!stickyEnd) rePinWireToMeta(el);
              else if (el.parentNode) syncWireMarks(el.parentNode, el, mkEl, state.wireMarkMode);
            }
          },
          "pt",
          el
        );
        h.pointIndex = i;
        h.breakVertex = i > 0 && i < pts.length - 1;
        h.stickyEnd = stickyEnd;
        state.handles.push(h);
      });
    } else if (t === "path") {
      const segs = parsePathAbs(el.getAttribute("d") || "");
      state.pathSegs.set(el, segs);
      segs.forEach((s, si) => {
        s.pts.forEach((p, pi) => {
          const kind = p.role === "ctrl" ? "ctrl" : "pt";
          state.handles.push(
            mkHandle(
              () => {
                const seg = state.pathSegs.get(el)[si];
                return [seg.pts[pi].x, seg.pts[pi].y];
              },
              (x, y) => {
                const seg = state.pathSegs.get(el)[si];
                seg.pts[pi].x = x;
                seg.pts[pi].y = y;
                el.setAttribute("d", buildD(state.pathSegs.get(el)));
              },
              kind,
              el
            )
          );
        });
      });
    }
  }
  drawHandles();
}
function drawHandles() {
  scene.handles.innerHTML = "";
  state.handles.forEach((h, idx) => {
    const [x, y] = h.get();
    if (h.kind === "ctrl") {
      // linia do... (pomijamy powiązanie, sam punkt)
    }
    const s = document.createElementNS(SVGNS, "rect");
    const sz = 6 / state.zoom;
    s.setAttribute("x", x - sz / 2);
    s.setAttribute("y", y - sz / 2);
    s.setAttribute("width", sz);
    s.setAttribute("height", sz);
    s.setAttribute(
      "class",
      "hnd" +
        (h.kind === "ctrl" ? " ctrl" : "") +
        (h.breakVertex ? " break" : "") +
        (h.stickyEnd ? " pin-end" : "") +
        (state.selHandle === h ? " sel" : "")
    );
    s.setAttribute("vector-effect", "non-scaling-stroke");
    if (h.breakVertex) s.setAttribute("title", "Punkt łamania · Delete / Alt+klik = usuń");
    s.dataset.idx = idx;
    s.addEventListener("pointerdown", (ev) => startDrag(ev, h, s));
    scene.handles.appendChild(s);
  });
}
function refreshHandlePositions() {
  const rects = scene.handles.children;
  state.handles.forEach((h, idx) => {
    const r = rects[idx];
    if (!r) return;
    const [x, y] = h.get();
    const sz = 6 / state.zoom;
    r.setAttribute("x", x - sz / 2);
    r.setAttribute("y", y - sz / 2);
    r.setAttribute("width", sz);
    r.setAttribute("height", sz);
  });
}

// ---- przeciąganie uchwytów ----
let dragging = null;
function startDrag(ev, h, rectEl) {
  if (state.drawMode) return;
  resetRotationSession();
  ev.stopPropagation();
  ev.preventDefault();
  if (h.kind === "lbl" && h.el) selectConnLabel(h.el);
  else clearConnLabelSel();
  // Alt+klik w punkt łamania → usuń
  if (ev.altKey && h.breakVertex && h.el) {
    if (removeBreakPointFrom(h.el, h.pointIndex)) return;
  }
  pushUndo();
  let groupMove = state.selection.length > 1 && h.el && state.selection.indexOf(h.el) >= 0;
  if (!groupMove) {
    state.activeEl = h.el || null;
    state.selection = h.el ? [h.el] : [];
  }
  dragging = { h, rectEl, groupMove };
  state.selHandle = h;
  markSel(rectEl);
  showSel(h);
  highlightActive();
  captureStagePointer(ev);
}

/** Dodaj punkt łamania w miejscu kliknięcia na segmencie. */
function insertBreakPointAt(el, x, y) {
  const maxDist = Math.max(10 / (state.zoom || 1), (state.step || 5) * 1.2);
  const hit = hitWireSegment(el, x, y, maxDist);
  if (!hit) return false;
  // unikaj wstawiania zbyt blisko istniejących wierzchołków
  const nearVert = hit.pts.some((p) => Math.hypot(p[0] - hit.x, p[1] - hit.y) < (state.step || 5) * 0.35);
  if (nearVert) return false;
  let nx = hit.x,
    ny = hit.y;
  if (state.snap) {
    nx = snap(nx);
    ny = snap(ny);
  }
  const next = insertVertex(hit.pts, hit.segmentIndex, nx, ny);
  if (!next) return false;
  pushUndo();
  const out = applyWirePoints(el, next, mkEl, state.wireMarkMode);
  state.selection = [out];
  state.activeEl = out;
  state.selHandle = null;
  clearSelInfo();
  render();
  // zaznacz nowy uchwyt
  const newIdx = hit.segmentIndex + 1;
  const h = state.handles.find((hh) => hh.el === out && hh.pointIndex === newIdx);
  if (h) {
    state.selHandle = h;
    drawHandles();
  }
  setStatus("Dodano punkt łamania.", { toast: true, tone: "success" });
  return true;
}

/** Usuń punkt łamania (wierzchołek pośredni). */
function removeBreakPointFrom(el, index) {
  const pts = pointsOfWire(el);
  if (!canRemoveBreakVertex(pts, index)) {
    setStatus("Można usuwać tylko punkty łamania (nie końce trasy).", { toast: true, tone: "warning" });
    return false;
  }
  const next = removeBreakVertex(pts, index);
  if (!next) return false;
  pushUndo();
  const out = applyWirePoints(el, next, mkEl, state.wireMarkMode);
  state.selection = [out];
  state.activeEl = out;
  state.selHandle = null;
  clearSelInfo();
  render();
  setStatus("Usunięto punkt łamania.", { toast: true, tone: "success" });
  return true;
}

function tryRemoveSelectedBreakVertex() {
  const h = state.selHandle;
  if (!h?.el || h.pointIndex == null || !h.breakVertex) return false;
  return removeBreakPointFrom(h.el, h.pointIndex);
}
stage.addEventListener("pointermove", (ev) => {
  const p = toWorld(ev);
  hud.textContent = `x:${fmt(p.x)}  y:${fmt(p.y)}`;
  if (state.drawMode && state.drawing) {
    let cx = p.x,
      cy = p.y;
    const j = state.drawing.kind === "line" ? nearestJoint(cx, cy) : null;
    if (j) {
      cx = j.x;
      cy = j.y;
    } else if (state.snap) {
      cx = snap(cx);
      cy = snap(cy);
    }
    state.drawing.cursor = [cx, cy];
    drawPreview();
    return;
  }
  if (dragging) {
    let x = p.x,
      y = p.y;
    if (dragging.h?.stickyEnd) {
      const j = typeof nearestJoint === "function" ? nearestJoint(x, y) : null;
      if (j) {
        x = j.x;
        y = j.y;
      } else if (state.snap) {
        x = snap(x);
        y = snap(y);
      }
    } else if (state.snap) {
      x = snap(x);
      y = snap(y);
    }
    if (dragging.groupMove) {
      const cur = dragging.h.get();
      const dx = x - cur[0],
        dy = y - cur[1];
      if (dx || dy) selEls().forEach((el) => moveElement(el, dx, dy));
      updateHostOnly();
      refreshHandlePositions();
      highlightActive();
    } else {
      dragging.h.set(x, y);
      updateHostOnly();
      refreshHandlePositions();
      showSel(dragging.h);
      highlightActive();
    }
  } else if (bodyDrag) {
    let dx = p.x - bodyDrag.sx,
      dy = p.y - bodyDrag.sy;
    if (state.snap) {
      dx = snap(dx);
      dy = snap(dy);
    }
    bodyDrag.dx = dx;
    bodyDrag.dy = dy;
    if (bodyDrag.labelOnly) {
      const tr = `translate(${fmt(dx)} ${fmt(dy)})`;
      bodyDrag.cel.setAttribute("transform", tr + (bodyDrag.baseTransform ? " " + bodyDrag.baseTransform : ""));
    } else {
      const tr = `translate(${fmt(dx)} ${fmt(dy)})`;
      bodyDrag.previews.forEach((p) =>
        p.cel.setAttribute("transform", tr + (p.baseTransform ? " " + p.baseTransform : ""))
      );
      scene.sel.setAttribute("transform", tr);
    }
  } else if (marquee) {
    marquee.x = p.x;
    marquee.y = p.y;
    updateMarqueeRect();
  } else if (panning) {
    state.panX += ev.clientX - panStart.x;
    state.panY += ev.clientY - panStart.y;
    panStart = { x: ev.clientX, y: ev.clientY };
    applyView();
  }
});
stage.addEventListener("pointerup", (ev) => {
  if (dragging) {
    dragging = null;
    buildHandles(currentSymNode());
  }
  if (bodyDrag) {
    scene.sel.removeAttribute("transform");
    if (bodyDrag.labelOnly) {
      if (bodyDrag.dx || bodyDrag.dy) moveConnLabel(bodyDrag.conn, bodyDrag.dx, bodyDrag.dy);
      selectConnLabel(bodyDrag.conn);
    } else if (bodyDrag.dx || bodyDrag.dy) {
      bodyDrag.els.forEach((el) => moveElement(el, bodyDrag.dx, bodyDrag.dy));
    }
    bodyDrag = null;
    render();
  }
  if (marquee) {
    finalizeMarquee();
  }
  panning = false;
});
stage.addEventListener("dblclick", (ev) => {
  if (state.drawMode) {
    ev.preventDefault();
    void finishShape();
  }
});

// ---- interaktywne rysowanie (createDrawMode / wireDrawMode) ----
/* syncDrawBanner — tworzony w bootstrap (draw-mode-ui.js) */
let connMetaResolve = null;
let connMetaModal = null;
function openConnMetaModal(node) {
  const bg = document.getElementById("connMeta");
  const refInp = document.getElementById("connMetaRef");
  const pinInp = document.getElementById("connMetaPin");
  const refRow = document.getElementById("connMetaRefRow");
  if (!bg || !pinInp) return Promise.resolve(null);
  const onSheet = isSchematicSheet(node);
  if (refRow) refRow.style.display = onSheet ? "flex" : "none";
  if (refInp) refInp.value = onSheet ? lastConnRefOnSheet(node) : "";
  pinInp.value = onSheet && refInp ? nextConnPinOnSheet(node, refInp.value || lastConnRefOnSheet(node)) : "1";
  if (connMetaModal) connMetaModal.open();
  else bg.classList.add("open");
  if (refInp && onSheet) refInp.focus();
  else pinInp.focus();
  return new Promise((resolve) => {
    connMetaResolve = resolve;
  });
}
function closeConnMetaModal(result) {
  const r = connMetaResolve;
  connMetaResolve = null;
  if (connMetaModal) connMetaModal.close();
  else {
    const bg = document.getElementById("connMeta");
    if (bg) bg.classList.remove("open");
  }
  if (r) r(result);
}
function initConnMetaModal() {
  connMetaModal = bindModalA11y({
    id: "connMeta",
    labelledBy: "connMetaTitle",
    initialFocus: "connMetaPin",
    onClose: () => {
      if (connMetaResolve) {
        const r = connMetaResolve;
        connMetaResolve = null;
        r(null);
      }
    },
  });
  const ok = document.getElementById("connMetaOk");
  const cancel = document.getElementById("connMetaCancel");
  const refInp = document.getElementById("connMetaRef");
  const pinInp = document.getElementById("connMetaPin");
  const submit = () => {
    const pin = ((pinInp && pinInp.value) || "").trim();
    if (!pin) {
      setStatus("Pin nie może być pusty.");
      return;
    }
    const ref = ((refInp && refInp.value) || "").trim().replace(/^-/, "");
    if (refInp && refInp.offsetParent !== null && !ref) {
      setStatus("Oznaczenie nie może być puste.");
      return;
    }
    closeConnMetaModal({ ref, pin });
  };
  if (ok) ok.onclick = submit;
  if (cancel) cancel.onclick = () => closeConnMetaModal(null);
  [refInp, pinInp].forEach((inp) => {
    if (inp)
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
  });
}
function captureToolStyleFromToolbar() {
  const sw = document.getElementById("strokeW"),
    sc = document.getElementById("strokeColor"),
    dash = document.getElementById("dashOn");
  const fillOn = document.getElementById("fillOn"),
    fc = document.getElementById("fillColor"),
    fs = document.getElementById("fontSize"),
    fw = document.getElementById("fontWeight");
  const v = parseFloat(sw && sw.value);
  if (!isNaN(v) && v > 0) state.strokeW = v;
  if (sc && sc.value) state.strokeColor = sc.value;
  if (dash) state.dashOn = !!dash.checked;
  if (fillOn) state.fillOn = !!fillOn.checked;
  if (fc && fc.value) state.fillColor = fc.value;
  const fz = parseFloat(fs && fs.value);
  if (!isNaN(fz) && fz > 0) state.fontSize = fz;
  if (fw && fw.value) state.fontWeight = parseInt(fw.value, 10) || 400;
  savePrefs();
}
function styleShape(el) {
  el.style.strokeWidth = fmt(state.strokeW);
  el.style.stroke = state.strokeColor;
  el.style.fill = state.fillOn ? state.fillColor : "none";
  el.style.strokeDasharray = state.dashOn ? "4 3" : "none";
}
function styleLine(el) {
  styleShape(el);
  el.style.fill = "none";
}
function styleText(el, opts = {}) {
  applyTextStyle(el, { fontSize: state.fontSize, fontWeight: state.fontWeight, strokeColor: state.strokeColor }, opts);
}
function styleNode(el) {
  el.style.fill = state.strokeColor;
}
// ---- model złączy (SSOT: conn-theme.js + conn-model.js) ----
let isConnGroup,
  isConnPoint,
  isConnLead,
  connParts,
  connKind,
  connJointR,
  connStrokeTargets,
  connFillTarget,
  connStyleSampleEl;
let applyConnStyle, updateConnContacts, updateConnGeometry, updateConnLabel, syncConnJointAnchor;
let setConnOuter, setConnOuterFree, setConnPointCenter, moveConn, pushConnContactCandidates, connEndpointCoords;
let promptConnMeta, mkConn, finishConnDraw, migrateConnModelImpl, dirFromDelta, connDirVector;
let lastConnRefOnSheet, nextConnPinOnSheet;

function isSchematicSheet(node) {
  return !!(node && /^sch-/.test(node.id || ""));
}

function wireConnModel() {
  const m = createConnModel({
    state,
    num,
    fmt,
    mkEl,
    setPositionedElement,
    styleText,
    isSchematicSheet,
    askConnMeta: openConnMetaModal,
  });
  ({
    isConnGroup,
    isConnPoint,
    isConnLead,
    connParts,
    connKind,
    connJointR,
    connStrokeTargets,
    connFillTarget,
    connStyleSampleEl,
    applyConnStyle,
    updateConnContacts,
    updateConnGeometry,
    updateConnLabel,
    syncConnJointAnchor,
    setConnOuter,
    setConnOuterFree,
    setConnPointCenter,
    moveConn,
    pushConnContactCandidates,
    connEndpointCoords,
    promptConnMeta,
    mkConn,
    finishConnDraw,
    migrateConnModel: migrateConnModelImpl,
    dirFromDelta,
    connDirVector,
    lastConnRefOnSheet,
    nextConnPinOnSheet,
  } = m);
}

function migrateConnModel() {
  return migrateConnModelImpl(state.lib, state.sheets, SVGNS);
}

function moveConnLabel(conn, dx, dy) {
  const label = connParts(conn).label;
  setConnLabelManual(conn);
  setPositionedElement(label, num(label, "x") + dx, num(label, "y") + dy);
}
function clearConnLabelSel() {
  state.connLabelSel = null;
}
function selectConnLabel(conn) {
  state.connLabelSel = conn;
  state.selection = [conn];
  state.activeEl = conn;
  state.selHandle = null;
}
function connLabelEl() {
  return state.connLabelSel ? connParts(state.connLabelSel).label : null;
}
function isConnLabelMode() {
  return !!state.connLabelSel;
}
function isConnLabelManual(g) {
  return g && g.getAttribute("data-label-manual") === "1";
}
function setConnLabelManual(g) {
  if (g) g.setAttribute("data-label-manual", "1");
}

function buildConnHandles(el) {
  const p = connParts(el),
    kind = connKind(el),
    jr = connJointR(el);
  if (kind === "point") {
    state.handles.push(
      mkHandle(
        () => [num(p.joint, "cx"), num(p.joint, "cy")],
        (x, y) => {
          clearConnLabelSel();
          setConnPointCenter(el, x, y);
        },
        "pt",
        el
      )
    );
    state.handles.push(
      mkHandle(
        () => [num(p.joint, "cx") + jr, num(p.joint, "cy")],
        (x, y) => {
          const cx = num(p.joint, "cx"),
            cy = num(p.joint, "cy"),
            r = Math.max(1, Math.hypot(x - cx, y - cy));
          p.joint.setAttribute("r", fmt(r));
          el.setAttribute("data-joint-r", fmt(r));
          updateConnContacts(el);
        },
        "pt",
        el
      )
    );
  } else {
    state.handles.push(
      mkHandle(
        () => [num(p.stub, "x1"), num(p.stub, "y1")],
        (x, y) => {
          clearConnLabelSel();
          p.stub.setAttribute("x1", fmt(x));
          p.stub.setAttribute("y1", fmt(y));
          updateConnGeometry(el);
        },
        "pt",
        el
      )
    );
    state.handles.push(
      mkHandle(
        () => [num(p.stub, "x2"), num(p.stub, "y2")],
        (x, y) => {
          clearConnLabelSel();
          setConnOuterFree(el, x, y);
        },
        "pt",
        el
      )
    );
  }
  state.handles.push(
    mkHandle(
      () => [num(p.label, "x"), num(p.label, "y")],
      (x, y) => {
        selectConnLabel(el);
        setConnLabelManual(el);
        setPositionedElement(p.label, x, y);
      },
      "lbl",
      el
    )
  );
}

function updateHostOnly() {
  rebuildHost(scene.host);
  attachBodyHandlers();
}

// ---- pan / zoom ----
let panning = false,
  panStart = { x: 0, y: 0 };
stage.addEventListener("pointerdown", (ev) => {
  if (state.drawMode) {
    if (ev.button !== 0) return;
    const p = toWorld(ev);
    addDrawPoint(p.x, p.y);
    return;
  }
  resetRotationSession();
  if (ev.target.classList && ev.target.classList.contains("hnd")) return;
  try {
    const sg = window.getSelection && window.getSelection();
    if (sg) sg.removeAllRanges();
  } catch (e) {} // usuń natywne zaznaczenie tekstu przeglądarki
  clearMarquee(); // usuń ewentualne osierocone prostokąty zaznaczenia (klik obok czyści duchy)
  clearConnLabelSel();
  state.selHandle = null;
  state.activeEl = null;
  state.selection = [];
  clearSelInfo();
  clearHighlight();
  clearNetlistRouteHighlight();
  syncSelectionToolbar();
  [...scene.handles.children].forEach((c) => c.classList.remove("sel"));
  if (ev.shiftKey || ev.button === 1) {
    panning = true;
    panStart = { x: ev.clientX, y: ev.clientY };
    captureStagePointer(ev);
    return;
  }
  const p = toWorld(ev);
  startMarquee(p.x, p.y);
  captureStagePointer(ev);
});
stage.addEventListener("pointercancel", () => {
  clearMarquee();
  panning = false;
  if (bodyDrag) {
    if (bodyDrag.labelOnly) bodyDrag.cel.removeAttribute("transform");
    else scene.sel.removeAttribute("transform");
    bodyDrag = null;
    render();
  }
  if (dragging) {
    dragging = null;
    render();
  }
});
stage.addEventListener("lostpointercapture", () => {
  if (marquee) finalizeMarquee();
});
let marquee = null,
  marqEl = null;
function clearMarquee() {
  if (scene.world) {
    [...scene.world.querySelectorAll("rect.marq")].forEach((n) => n.remove());
  }
  marquee = null;
  marqEl = null;
}
function startMarquee(sx, sy) {
  clearMarquee();
  marquee = { sx, sy, x: sx, y: sy };
  marqEl = document.createElementNS(SVGNS, "rect");
  marqEl.setAttribute("class", "marq");
  marqEl.setAttribute("fill", "rgba(37,99,235,0.08)");
  marqEl.setAttribute("stroke", "#2563eb");
  marqEl.setAttribute("stroke-width", "1");
  marqEl.setAttribute("stroke-dasharray", "4 2");
  marqEl.setAttribute("vector-effect", "non-scaling-stroke");
  marqEl.style.pointerEvents = "none";
  scene.world.appendChild(marqEl);
  updateMarqueeRect();
}
function updateMarqueeRect() {
  if (!marqEl || !marquee) return;
  const x = Math.min(marquee.sx, marquee.x),
    y = Math.min(marquee.sy, marquee.y),
    w = Math.abs(marquee.x - marquee.sx),
    h = Math.abs(marquee.y - marquee.sy);
  marqEl.setAttribute("x", fmt(x));
  marqEl.setAttribute("y", fmt(y));
  marqEl.setAttribute("width", fmt(w));
  marqEl.setAttribute("height", fmt(h));
}
function finalizeMarquee() {
  const mx0 = Math.min(marquee.sx, marquee.x),
    mx1 = Math.max(marquee.sx, marquee.x),
    my0 = Math.min(marquee.sy, marquee.y),
    my1 = Math.max(marquee.sy, marquee.y);
  [...scene.world.querySelectorAll("rect.marq")].forEach((n) => n.remove());
  marqEl = null;
  const tiny = mx1 - mx0 < 1 && my1 - my0 < 1;
  marquee = null;
  if (tiny) return;
  const node = currentSymNode();
  if (!node) return;
  const root = scene.hostRoot;
  if (!root) return;
  const sel = [];
  // zaznaczamy tylko elementy, które w CAŁOŚCI mieszczą się w ramce (zawieranie),
  // dzięki czemu duże obramowania/tabelki nie łapią się przy zaznaczaniu ich wnętrza
  [...node.children].forEach((el, i) => {
    const cel = root.children[i];
    if (!cel) return;
    let b;
    try {
      b = bboxInRoot(cel, root);
    } catch (e) {
      return;
    }
    if (b.x >= mx0 && b.y >= my0 && b.x + b.width <= mx1 && b.y + b.height <= my1) sel.push(el);
  });
  state.selection = sel;
  state.activeEl = sel[sel.length - 1] || null;
  clearConnLabelSel();
  highlightActive();
  setStatus("Zaznaczono obszarem: " + sel.length);
}
stage.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    const p = toWorld(ev);
    const f = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nz = Math.min(40, Math.max(0.5, state.zoom * f));
    // utrzymaj punkt pod kursorem
    state.panX = ev.clientX - stageRect().left - p.x * nz;
    state.panY = ev.clientY - stageRect().top - p.y * nz;
    state.zoom = nz;
    applyView();
    refreshHandlePositions();
    drawHandles();
  },
  { passive: false }
);
function stageRect() {
  return stage.getBoundingClientRect();
}
function toWorld(ev) {
  const pt = stage.createSVGPoint();
  pt.x = ev.clientX;
  pt.y = ev.clientY;
  const m = scene.world.getScreenCTM().inverse();
  return pt.matrixTransform(m);
}

// ---- snap ----
function snap(v) {
  return Math.round(v / state.step) * state.step;
}

function showSel() {}
function clearSelInfo() {}
function markSel(rectEl) {
  [...scene.handles.children].forEach((c) => c.classList.remove("sel"));
  rectEl.classList.add("sel");
}

// ---- undo/redo ----
let pushUndo, doUndo, doRedo;
function wireHistory() {
  const h = createHistory({
    state,
    parseSvg,
    buildSymbolList,
    currentSymNode,
    clearHighlight,
    clearSelInfo,
    render,
    setStatus,
    onMutate: markActiveDirty,
  });
  pushUndo = h.pushUndo;
  doUndo = h.doUndo;
  doRedo = h.doRedo;
  document.getElementById("btnUndo").onclick = doUndo;
  document.getElementById("btnRedo").onclick = doRedo;
}

// ---- toolbar ----
document.getElementById("grid").onchange = (e) => {
  state.step = parseFloat(e.target.value);
  gridB = { x0: 0, x1: 0, y0: 0, y1: 0 };
  ensureGrid();
  drawGrid();
  savePrefs();
};
document.getElementById("snap").onchange = (e) => {
  state.snap = e.target.checked;
  savePrefs();
};
document.getElementById("showHandles").onchange = (e) => {
  state.showHandles = e.target.checked;
  if (scene.handles) scene.handles.style.display = state.showHandles ? "" : "none";
  savePrefs();
};
document.getElementById("rotateOwnedLabels").onchange = (e) => {
  state.rotateOwnedLabels = e.target.checked;
  savePrefs();
};
document.getElementById("rotAng").onchange = savePrefs;
function styleTargetCtx() {
  return {
    isConnLabelMode,
    isConnGroup,
    isConnPoint,
    connParts,
    connStrokeTargets,
    connFillTarget,
    sheetNode: currentSymNode(),
  };
}
function mergedStyleTargets(records) {
  return resolveStyleTargetsForRecords(records, styleTargetCtx());
}
function rgbToHex(c) {
  if (!c) return null;
  c = c.trim();
  if (c[0] === "#") return c;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((s) => parseFloat(s));
  if (p.length < 3) return null;
  const h = (n) => ("0" + Math.round(n).toString(16)).slice(-2);
  return "#" + h(p[0]) + h(p[1]) + h(p[2]);
}
function setGroupVisible(id, on) {
  document.getElementById(id).classList.toggle("context-hidden", !on);
}
function setMixedColor(inputId, markId, mixed, value) {
  const input = document.getElementById(inputId),
    mark = document.getElementById(markId);
  if (!input.dataset.baseTitle) input.dataset.baseTitle = input.title;
  input.classList.toggle("mixed", mixed);
  mark.classList.toggle("show", mixed);
  input.title = mixed ? "Różne wartości \u2014 wybierz kolor, aby ujednolicić" : input.dataset.baseTitle || input.title;
  if (!mixed && value) input.value = value;
}
function setSelectState(sel, value, mixed) {
  [...sel.options].filter((o) => o.dataset.custom === "1").forEach((o) => o.remove());
  if (mixed || value === null || value === undefined) {
    sel.value = "";
    return;
  }
  const v = String(value),
    found = [...sel.options].find((o) => o.value === v);
  if (found) {
    sel.value = v;
    return;
  }
  const o = document.createElement("option");
  o.value = v;
  o.textContent = v;
  o.dataset.custom = "1";
  sel.appendChild(o);
  sel.value = v;
}
function primaryColorOf(r) {
  const authored = authoredStrokeColor(r?.el);
  if (authored) {
    const hex = rgbToHex(authored);
    if (hex) return hex;
  }
  return primaryColorFromRecord(r, styleTargetCtx(), { rgbToHex, sceneDefs: scene?.defs });
}
function selectionTypeLabel(records) {
  if (isConnLabelMode()) return "napis przy\u0142\u0105cza";
  const names = {
    text: "tekst",
    line: "linia",
    rect: "prostok\u0105t",
    circle: "ko\u0142o",
    polyline: "\u0142amana",
    polygon: "wielok\u0105t",
    path: "\u015bcie\u017cka",
    use: "symbol",
    node: "w\u0119ze\u0142",
    point: "punkt",
    lead: "kreska",
    pin: "pin",
  };
  const kind = (r) => (isConnGroup(r.el) ? connKind(r.el) : r.el.classList.contains("node") ? "node" : r.tag);
  const tags = [...new Set(records.map(kind))],
    n = records.length;
  return tags.length === 1 ? n + " \u00d7 " + (names[tags[0]] || tags[0]) : n + " element\u00f3w \u00b7 mieszane";
}
function syncSelectionToolbar() {
  const records = selectedRecords(),
    has = records.length > 0;
  const promoteBtn = document.getElementById("btnPromoteConn");
  if (promoteBtn) {
    const el = state.activeEl || state.selection?.[0];
    const tag = el?.tagName?.toLowerCase?.() || "";
    promoteBtn.disabled = !(tag === "line" || tag === "polyline");
  }
  const info = document.getElementById("selectionInfo");
  if (state.active === state.lib) {
    syncLibrarySelectionInfo();
  } else {
    info.textContent = has ? selectionTypeLabel(records) : W.selection.newObjectStyle;
    info.title = has ? records.map((r) => r.tag).join(", ") : "Styl nowych obiektów";
  }

  const alignIds = [
    "btnAlignLeft",
    "btnAlignCenterH",
    "btnAlignRight",
    "btnAlignTop",
    "btnAlignCenterV",
    "btnAlignBottom",
  ];
  ["btnFlipH", "btnFlipV", "btnRotL", "btnRotR", "btnClone", "btnDelShape", ...alignIds].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !has;
  });
  const nodeAlign = currentSymNode();
  const alignEls = nodeAlign
    ? resolveAlignElements(
        selEls().filter((el) => el.parentNode === nodeAlign),
        { expandToInstanceMembers, instanceRefOf, node: nodeAlign }
      )
    : [];
  const alignUnits = buildAlignUnits(alignEls, instanceRefOf);
  const canAlign = alignUnits.length >= 2;
  alignIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !canAlign;
  });
  document.getElementById("rotAng").disabled = !has;
  document.getElementById("btnCopy").disabled = !has;
  document.getElementById("btnCut").disabled = !has;
  document.getElementById("btnPaste").disabled = !state.clipboard.length;

  const sr = strokeRecords(records),
    fr = fillRecords(records),
    tr = textRecords(records);
  setGroupVisible("primaryStyleGroup", true);
  setGroupVisible("strokeStyleGroup", !has || sr.length > 0);
  setGroupVisible("fillStyleGroup", !has || fr.length > 0);
  setGroupVisible("textStyleGroup", !has || tr.length > 0);

  const sw = document.getElementById("strokeW"),
    dash = document.getElementById("dashOn");
  const fillOn = document.getElementById("fillOn"),
    fs = document.getElementById("fontSize"),
    fw = document.getElementById("fontWeight");
  if (!has) {
    setMixedColor("strokeColor", "primaryColorMixed", false, state.strokeColor);
    setMixedColor("fillColor", "fillColorMixed", false, state.fillColor);
    setSelectState(sw, state.strokeW, false);
    dash.indeterminate = false;
    dash.checked = state.dashOn;
    fillOn.indeterminate = false;
    fillOn.checked = state.fillOn;
    fs.value = state.fontSize;
    setSelectState(fw, String(state.fontWeight), false);
    syncToolbarContext();
    return;
  }

  const pc = commonValue(records.map(primaryColorOf));
  setMixedColor("strokeColor", "primaryColorMixed", pc.mixed, pc.value);

  if (sr.length) {
    const widths = commonValue(
      sr.map((r) => {
        const authored = authoredStrokeWidth(r.el);
        if (authored != null) return fmt(authored);
        const n = parseFloat(r.cs.strokeWidth);
        return isNaN(n) ? null : fmt(n);
      })
    );
    setSelectState(sw, widths.value, widths.mixed);
    const dashes = commonValue(
      sr.map((r) => {
        const d = r.cs.strokeDasharray;
        return !!d && d !== "none";
      })
    );
    dash.indeterminate = dashes.mixed;
    dash.checked = !!dashes.value;
  }
  if (fr.length) {
    const fillsOn = commonValue(fr.map((r) => paintVisible(r.cs.fill)));
    fillOn.indeterminate = fillsOn.mixed;
    fillOn.checked = !!fillsOn.value;
    const fc = commonValue(fr.map((r) => (paintVisible(r.cs.fill) ? rgbToHex(r.cs.fill) : null)));
    setMixedColor("fillColor", "fillColorMixed", fc.mixed, fc.value);
  }
  if (tr.length) {
    const sizes = commonValue(
      tr.map((r) => {
        const n = parseFloat(r.cs.fontSize);
        return isNaN(n) ? null : fmt(n);
      })
    );
    fs.value = sizes.mixed ? "" : sizes.value || "";
    const weights = commonValue(
      tr.map((r) => {
        let w = r.cs.fontWeight;
        if (w === "normal") w = "400";
        if (w === "bold") w = "700";
        return w;
      })
    );
    setSelectState(fw, weights.value, weights.mixed);
  }
  syncToolbarContext();
}
document.getElementById("strokeColor").onchange = (e) => {
  const color = e.target.value;
  state.strokeColor = color;
  savePrefs();
  const records = selectedRecords();
  if (records.length) {
    pushUndo();
    applyPrimaryColor(mergedStyleTargets(records), color);
    render();
    setStatus("Kolor = " + color + " (" + records.length + " zazn.)");
  } else syncSelectionToolbar();
};
document.getElementById("fillColor").onchange = (e) => {
  const color = e.target.value;
  state.fillColor = color;
  savePrefs();
  const t = mergedStyleTargets(fillRecords());
  if (t.fills.length) {
    pushUndo();
    applyFill(t, color, true);
    render();
    setStatus("Wypełnienie = " + color + " (" + t.fills.length + " elem.)");
  } else syncSelectionToolbar();
};
document.getElementById("fillOn").onchange = (e) => {
  const c = e.target;
  c.indeterminate = false;
  state.fillOn = c.checked;
  savePrefs();
  const t = mergedStyleTargets(fillRecords());
  if (t.fills.length) {
    const on = c.checked,
      color = document.getElementById("fillColor").value;
    pushUndo();
    applyFill(t, color, on);
    render();
    setStatus((on ? "Wypełnienie = " + color : "Bez wypełnienia") + " (" + t.fills.length + " elem.)");
  } else syncSelectionToolbar();
};
document.getElementById("dashOn").onchange = (e) => {
  const c = e.target;
  c.indeterminate = false;
  state.dashOn = c.checked;
  savePrefs();
  const t = mergedStyleTargets(strokeRecords(selectedRecords()));
  if (t.strokes.length) {
    const on = c.checked;
    pushUndo();
    applyStrokeDash(t, on);
    render();
    setStatus((on ? "Linia przerywana" : "Linia ciągła") + " (" + t.strokes.length + " zazn.)");
  }
};
document.getElementById("fontSize").onchange = (e) => {
  const v = parseFloat(e.target.value);
  if (isNaN(v) || v <= 0) return;
  state.fontSize = v;
  savePrefs();
  const t = mergedStyleTargets(textRecords());
  if (t.texts.length) {
    pushUndo();
    applyFont(t, { fontSize: v });
    render();
    setStatus("Czcionka = " + v + " px (" + t.texts.length + " elem.)");
  }
};
document.getElementById("fontWeight").onchange = (e) => {
  const w = e.target.value;
  if (!w) return;
  state.fontWeight = parseInt(w, 10) || 400;
  savePrefs();
  const t = mergedStyleTargets(textRecords());
  if (t.texts.length) {
    pushUndo();
    applyFont(t, { fontWeight: w });
    render();
    setStatus("Waga czcionki = " + w + " (" + t.texts.length + " elem.)");
  }
};
function cloneSelection() {
  const node = currentSymNode();
  if (!node) return;
  const els = selEls().filter((el) => el.parentNode === node);
  if (!els.length) {
    setStatus("Nic nie zaznaczono do klonowania.");
    return;
  }
  pushUndo();
  const clones = [];
  els.forEach((el) => {
    const c = el.cloneNode(true);
    node.appendChild(c);
    moveElement(c, state.step, state.step);
    if (c.tagName.toLowerCase() === "use") {
      const sym =
        c.getAttribute("data-sym") ||
        (c.getAttribute("href") || c.getAttributeNS(XLINK, "href") || "").replace(/^#/, "");
      const ref = nextInstanceRef(node, sym);
      c.setAttribute("data-ref", ref);
      const lbl = mkEl("text", { x: num(c, "x") + 5, y: num(c, "y") - 5, class: "did", "data-owner-ref": ref });
      lbl.textContent = "-" + ref;
      styleText(lbl);
      node.appendChild(lbl);
    } else if (isConnGroup(c) && c.getAttribute("data-ref"))
      c.setAttribute("data-pin", nextConnPinOnSheet(node, c.getAttribute("data-ref")));
    clones.push(c);
  });
  state.selection = clones;
  state.activeEl = clones[clones.length - 1];
  render();
  setStatus("Sklonowano: " + clones.length);
}
// ---- schowek + nudge ----
function selectAllElements() {
  const node = currentSymNode();
  if (!node) return;
  state.selHandle = null;
  state.selection = [...node.children];
  state.activeEl = state.selection[state.selection.length - 1] || null;
  clearSelInfo();
  highlightActive();
  setStatus("Zaznaczono wszystko: " + state.selection.length);
}
function copySel() {
  const els = selEls().filter((el) => el.parentNode === currentSymNode());
  if (!els.length) {
    setStatus("Nic nie zaznaczono do skopiowania.");
    return false;
  }
  state.clipboard = els.map((el) => el.cloneNode(true));
  syncSelectionToolbar();
  setStatus("Skopiowano: " + els.length);
  return true;
}
function cutSel() {
  if (copySel()) deleteActiveEl();
}
function pasteClip(inPlace) {
  const node = currentSymNode();
  if (!node) {
    setStatus("Najpierw wybierz symbol.");
    return;
  }
  if (!state.clipboard.length) {
    setStatus("Schowek jest pusty.");
    return;
  }
  pushUndo();
  const clones = [];
  state.clipboard.forEach((el) => {
    const c = el.cloneNode(true);
    node.appendChild(c);
    if (!inPlace) moveElement(c, state.step, state.step);
    clones.push(c);
  });
  state.selection = clones;
  state.activeEl = clones[clones.length - 1];
  render();
  setStatus((inPlace ? "Wklejono w miejscu: " : "Wklejono: ") + clones.length);
}
function nudge(dx, dy) {
  const node = currentSymNode();
  if (!node) return;
  const els = selEls().filter((el) => el.parentNode === node);
  if (!els.length) return;
  pushUndo();
  els.forEach((el) => moveElement(el, dx, dy));
  render();
}
document.getElementById("btnCopy").onclick = () => copySel();
document.getElementById("btnCut").onclick = cutSel;
document.getElementById("btnPaste").onclick = () => pasteClip(false);

let rotationSession = null;
function resetRotationSession() {
  rotationSession = null;
}
function sameRotationSelection(els) {
  return (
    rotationSession && rotationSession.els.length === els.length && els.every((el, i) => rotationSession.els[i] === el)
  );
}
function selectionCenter() {
  const node = currentSymNode();
  const root = scene.hostRoot;
  if (!node || !root) return null;
  let minx = 1 / 0,
    miny = 1 / 0,
    maxx = -1 / 0,
    maxy = -1 / 0,
    any = false;
  selEls().forEach((el) => {
    const i = Array.prototype.indexOf.call(node.children, el);
    const cel = root.children[i];
    if (!cel) return;
    let b;
    try {
      b = bboxInRoot(cel, root);
    } catch (e) {
      return;
    }
    minx = Math.min(minx, b.x);
    miny = Math.min(miny, b.y);
    maxx = Math.max(maxx, b.x + b.width);
    maxy = Math.max(maxy, b.y + b.height);
    any = true;
  });
  return any ? [(minx + maxx) / 2, (miny + maxy) / 2] : null;
}
function rotateConn(g, cx, cy, deg) {
  const p = connParts(g);
  [
    ["x1", "y1"],
    ["x2", "y2"],
  ].forEach(([ax, ay]) => {
    const q = rotatePoint(num(p.stub, ax), num(p.stub, ay), cx, cy, deg);
    p.stub.setAttribute(ax, fmtRot(q[0]));
    p.stub.setAttribute(ay, fmtRot(q[1]));
  });
  const jq = rotatePoint(num(p.joint, "cx"), num(p.joint, "cy"), cx, cy, deg);
  p.joint.setAttribute("cx", fmtRot(jq[0]));
  p.joint.setAttribute("cy", fmtRot(jq[1]));
  g.setAttribute(
    "data-dir",
    dirFromDelta(num(p.stub, "x2") - num(p.stub, "x1"), num(p.stub, "y2") - num(p.stub, "y1"))
  );
  updateConnLabel(g);
  updateConnContacts(g);
  // Pin-label: tylko pozycja (updateConnLabel); kąt zawsze 0 — syncInstanceLabelAngles
  return g;
}
function rotateElement(el, cx, cy, deg) {
  const t = el.tagName.toLowerCase();
  if (isConnGroup(el)) return rotateConn(el, cx, cy, deg);
  if (t === "line") {
    const [a, b] = rotatePoint(num(el, "x1"), num(el, "y1"), cx, cy, deg);
    const [c, d] = rotatePoint(num(el, "x2"), num(el, "y2"), cx, cy, deg);
    el.setAttribute("x1", fmtRot(a));
    el.setAttribute("y1", fmtRot(b));
    el.setAttribute("x2", fmtRot(c));
    el.setAttribute("y2", fmtRot(d));
    return el;
  }
  if (t === "circle") {
    const [a, b] = rotatePoint(num(el, "cx"), num(el, "cy"), cx, cy, deg);
    el.setAttribute("cx", fmtRot(a));
    el.setAttribute("cy", fmtRot(b));
    return el;
  }
  if (t === "polyline" || t === "polygon") {
    const a = parsePoints(el).map((p) => rotatePoint(p[0], p[1], cx, cy, deg));
    el.setAttribute("points", a.map((q) => q.map(fmtRot).join(",")).join(" "));
    return el;
  }
  if (t === "path") {
    const segs = parsePathAbs(el.getAttribute("d") || "");
    segs.forEach((s) =>
      s.pts.forEach((p) => {
        const [a, b] = rotatePoint(p.x, p.y, cx, cy, deg);
        p.x = a;
        p.y = b;
      })
    );
    el.setAttribute("d", buildD(segs, fmtRot));
    return el;
  }
  if (t === "rect") {
    const x = num(el, "x"),
      y = num(el, "y"),
      w = num(el, "width"),
      h = num(el, "height");
    const corners = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ].map((p) => rotatePoint(p[0], p[1], cx, cy, deg));
    const poly = document.createElementNS(SVGNS, "polygon");
    if (el.getAttribute("class")) poly.setAttribute("class", el.getAttribute("class"));
    if (el.getAttribute("style")) poly.setAttribute("style", el.getAttribute("style"));
    poly.setAttribute("points", corners.map((q) => q.map(fmtRot).join(",")).join(" "));
    el.parentNode.replaceChild(poly, el);
    return poly;
  }
  if (t === "text" || t === "use") {
    const [a, b] = rotatePoint(num(el, "x"), num(el, "y"), cx, cy, deg);
    el.setAttribute("x", fmtRot(a));
    el.setAttribute("y", fmtRot(b));
    // Opisy instancji: przesuwaj pozycję, nie obracaj napisu
    if (t === "text" && isInstanceOwnedText(el)) {
      el.setAttribute("data-ang", "0");
      el.setAttribute("transform", `rotate(0 ${fmtRot(a)} ${fmtRot(b)})`);
      return el;
    }
    if (t === "use") {
      const o = readUseOrient(el);
      writeUseOrient(el, { ...o, ang: o.ang + deg }, a, b);
      return el;
    }
    const ang = parseFloat(el.getAttribute("data-ang") || "0") + deg;
    el.setAttribute("data-ang", fmtRot(ang));
    el.setAttribute("transform", `rotate(${fmtRot(ang)} ${fmtRot(a)} ${fmtRot(b)})`);
    return el;
  }
  return el;
}
function rotateSelection(deg) {
  const node = currentSymNode();
  if (!node) return;
  const picked = selEls().filter((el) => el.parentNode === node);
  if (!picked.length) {
    setStatus("Zaznacz elementy do obrotu.");
    return;
  }
  const ctr = sameRotationSelection(picked) ? rotationSession.center : selectionCenter();
  if (!ctr) return;
  pushUndo();
  const els = collectFlipTargets(picked, node, {
    expandToInstanceMembers,
    instanceRefOf,
    rotateOwnedLabels: state.rotateOwnedLabels,
  });
  const pickedSet = new Set(picked);
  const ns = els.map((el) => rotateElement(el, ctr[0], ctr[1], deg));
  instanceRefsFromElements(ns).forEach((ref) => syncInstanceLabelAngles(node, ref, { connParts }));
  state.selection = ns.filter((el) => pickedSet.has(el));
  if (!state.selection.length) state.selection = ns.slice();
  state.activeEl = state.selection[state.selection.length - 1] || ns[ns.length - 1] || null;
  rotationSession = { els: state.selection.slice(), center: ctr };
  render();
  setStatus("Obrócono o " + deg + "\u00b0 (" + ns.length + " elem.)");
}
document.getElementById("btnRotL").onclick = () =>
  rotateSelection(-Math.abs(parseFloat(document.getElementById("rotAng").value) || 90));
document.getElementById("btnRotR").onclick = () =>
  rotateSelection(Math.abs(parseFloat(document.getElementById("rotAng").value) || 90));
document.getElementById("toolbar").addEventListener("pointerdown", (e) => {
  const b = e.target.closest && e.target.closest("button");
  if (!b || (b.id !== "btnRotL" && b.id !== "btnRotR")) resetRotationSession();
});

// ---- odbicie lustrzane ----
function flipConn(g, cx, cy, axis) {
  const p = connParts(g);
  if (isConnPoint(g)) {
    const [jx, jy] = flipPoint(num(p.joint, "cx"), num(p.joint, "cy"), cx, cy, axis);
    setConnPointCenter(g, jx, jy);
    const dir = g.getAttribute("data-dir") || "E";
    const flipMap = axis === "h" ? { N: "N", S: "S", E: "W", W: "E" } : { N: "S", S: "N", E: "E", W: "W" };
    if (flipMap[dir]) g.setAttribute("data-dir", flipMap[dir]);
    updateConnContacts(g);
  } else {
    const [x1, y1] = flipPoint(num(p.stub, "x1"), num(p.stub, "y1"), cx, cy, axis);
    const [x2, y2] = flipPoint(num(p.stub, "x2"), num(p.stub, "y2"), cx, cy, axis);
    p.stub.setAttribute("x1", fmt(x1));
    p.stub.setAttribute("y1", fmt(y1));
    p.stub.setAttribute("x2", fmt(x2));
    p.stub.setAttribute("y2", fmt(y2));
    p.joint.setAttribute("cx", fmt(x2));
    p.joint.setAttribute("cy", fmt(y2));
    g.setAttribute("data-dir", dirFromDelta(x2 - x1, y2 - y1));
    updateConnGeometry(g);
  }
  if (p.label) {
    const [lx, ly] = flipPoint(num(p.label, "x"), num(p.label, "y"), cx, cy, axis);
    p.label.setAttribute("x", fmt(lx));
    p.label.setAttribute("y", fmt(ly));
    p.label.setAttribute("data-ang", "0");
    p.label.setAttribute("transform", `rotate(0 ${fmt(lx)} ${fmt(ly)})`);
    if (axis === "h") {
      const cur = p.label.getAttribute("text-anchor") || "start";
      const nx = cur === "end" ? "start" : cur === "start" ? "end" : "middle";
      p.label.setAttribute("text-anchor", nx);
    }
  }
  return g;
}
function flipElement(el, cx, cy, axis) {
  if (!el || el.getAttribute?.("data-role") === "wire-mark") return el;
  const t = el.tagName.toLowerCase();
  if (isConnGroup(el)) return flipConn(el, cx, cy, axis);
  if (t === "line") {
    const [a, b] = flipPoint(num(el, "x1"), num(el, "y1"), cx, cy, axis);
    const [c, d] = flipPoint(num(el, "x2"), num(el, "y2"), cx, cy, axis);
    el.setAttribute("x1", fmt(a));
    el.setAttribute("y1", fmt(b));
    el.setAttribute("x2", fmt(c));
    el.setAttribute("y2", fmt(d));
    return el;
  }
  if (t === "circle") {
    const [a, b] = flipPoint(num(el, "cx"), num(el, "cy"), cx, cy, axis);
    el.setAttribute("cx", fmt(a));
    el.setAttribute("cy", fmt(b));
    return el;
  }
  if (t === "polyline" || t === "polygon") {
    const a = parsePoints(el).map((p) => flipPoint(p[0], p[1], cx, cy, axis));
    el.setAttribute("points", a.map((q) => q.map(fmt).join(",")).join(" "));
    return el;
  }
  if (t === "path") {
    const segs = parsePathAbs(el.getAttribute("d") || "");
    segs.forEach((s) =>
      s.pts.forEach((p) => {
        const [a, b] = flipPoint(p.x, p.y, cx, cy, axis);
        p.x = a;
        p.y = b;
      })
    );
    el.setAttribute("d", buildD(segs));
    return el;
  }
  if (t === "rect") {
    const x = num(el, "x"),
      y = num(el, "y"),
      w = num(el, "width"),
      h = num(el, "height");
    if (axis === "h") {
      el.setAttribute("x", fmt(2 * cx - (x + w)));
    } else {
      el.setAttribute("y", fmt(2 * cy - (y + h)));
    }
    return el;
  }
  if (t === "text" || t === "use") {
    const [a, b] = flipPoint(num(el, "x"), num(el, "y"), cx, cy, axis);
    el.setAttribute("x", fmt(a));
    el.setAttribute("y", fmt(b));
    if (t === "use") {
      writeUseOrient(el, composeSheetFlip(readUseOrient(el), axis), a, b);
      return el;
    }
    if (isInstanceOwnedText(el)) {
      el.setAttribute("data-ang", "0");
      el.setAttribute("transform", `rotate(0 ${fmt(a)} ${fmt(b)})`);
      if (axis === "h") {
        const cur = el.getAttribute("text-anchor") || "start";
        const nx = cur === "end" ? "start" : cur === "start" ? "end" : "middle";
        el.setAttribute("text-anchor", nx);
      }
      return el;
    }
    const hasAng = el.hasAttribute("data-ang");
    const rot = hasAng ? null : simpleRotation(el);
    const baseAng = hasAng ? parseFloat(el.getAttribute("data-ang") || "0") : rot ? rot.ang : null;
    if (baseAng != null && !isNaN(baseAng)) {
      const ang = normalizeAngleDeg(flipAngleDeg(baseAng, axis));
      el.setAttribute("data-ang", fmt(ang));
      el.setAttribute("transform", `rotate(${fmt(ang)} ${fmt(a)} ${fmt(b)})`);
    } else {
      el.removeAttribute("transform");
    }
    if (axis === "h") {
      const cur = el.getAttribute("text-anchor") || "start";
      const nx = cur === "end" ? "start" : cur === "start" ? "end" : "middle";
      el.setAttribute("text-anchor", nx);
    }
    return el;
  }
  return el;
}
function flipSelection(axis) {
  const node = currentSymNode();
  if (!node) return;
  const picked = selEls().filter((el) => el.parentNode === node);
  if (!picked.length) {
    setStatus("Zaznacz elementy do odbicia.");
    return;
  }
  resetRotationSession();
  const ctr = selectionCenter();
  if (!ctr) return;
  const els = collectFlipTargets(picked, node, {
    expandToInstanceMembers,
    instanceRefOf,
    rotateOwnedLabels: state.rotateOwnedLabels,
  });
  pushUndo();
  const pickedSet = new Set(picked);
  const ns = els.map((el) => flipElement(el, ctr[0], ctr[1], axis));
  ns.forEach((el) => {
    if (isWireGeometry(el) && el.getAttribute("data-conn-id")) rePinWireToMeta(el);
  });
  instanceRefsFromElements(ns).forEach((ref) => syncInstanceLabelAngles(node, ref, { connParts }));
  state.selection = ns.filter((el) => pickedSet.has(el));
  if (!state.selection.length) state.selection = ns.slice();
  state.activeEl = state.selection[state.selection.length - 1] || ns[ns.length - 1] || null;
  render();
  setStatus("Odbito " + (axis === "h" ? "w poziomie" : "w pionie") + " (" + ns.length + " elem.)");
}
document.getElementById("btnFlipH").onclick = () => flipSelection("h");
document.getElementById("btnFlipV").onclick = () => flipSelection("v");

function elementHostBBox(el) {
  const node = currentSymNode(),
    root = scene.hostRoot;
  if (!node || !root || !el || el.parentNode !== node) return null;
  const i = Array.prototype.indexOf.call(node.children, el);
  const cel = root.children[i];
  if (!cel) return null;
  try {
    return bboxInRoot(cel, root);
  } catch (e) {
    return null;
  }
}
/** Przesuń członków jednostki bez podwójnego cascade z moveElement(use). */
function translateMembers(members, dx, dy) {
  if (!dx && !dy) return;
  (members || []).forEach((el) => {
    if (!el) return;
    if (isConnGroup(el)) {
      moveConn(el, dx, dy);
      return;
    }
    const t = el.tagName && el.tagName.toLowerCase();
    if (t === "use" || t === "text") {
      setPositionedElement(el, num(el, "x") + dx, num(el, "y") + dy);
      return;
    }
    moveElement(el, dx, dy);
  });
}
function alignSelection(mode) {
  const node = currentSymNode();
  if (!node) return;
  let els = selEls().filter((el) => el.parentNode === node);
  if (!els.length) {
    setStatus(W.align.needTwo);
    return;
  }
  els = resolveAlignElements(els, { expandToInstanceMembers, instanceRefOf, node });
  state.selection = els.slice();
  state.activeEl = els[0] || null;
  const units = buildAlignUnits(els, instanceRefOf);
  if (units.length < 2) {
    setStatus(W.align.needTwo);
    syncSelectionToolbar();
    return;
  }
  const unitBoxes = units
    .map((u) => {
      const box = unionBox(u.members.map(elementHostBBox).filter(Boolean));
      return box ? { id: u.id, box, members: u.members } : null;
    })
    .filter(Boolean);
  const deltas = computeAlignDeltas(unitBoxes, mode);
  if (!deltas.length) {
    setStatus(W.align.done(mode, units.length));
    return;
  }
  resetRotationSession();
  pushUndo();
  const byId = new Map(unitBoxes.map((u) => [u.id, u]));
  deltas.forEach(({ id, dx, dy }) => {
    const u = byId.get(id);
    if (u) translateMembers(u.members, dx, dy);
  });
  markActiveDirty();
  render();
  syncElementListSelection();
  syncSelectionToolbar();
  setStatus(W.align.done(mode, units.length));
  saveProject();
}
document.getElementById("btnAlignLeft").onclick = () => alignSelection("left");
document.getElementById("btnAlignCenterH").onclick = () => alignSelection("centerH");
document.getElementById("btnAlignRight").onclick = () => alignSelection("right");
document.getElementById("btnAlignTop").onclick = () => alignSelection("top");
document.getElementById("btnAlignCenterV").onclick = () => alignSelection("centerV");
document.getElementById("btnAlignBottom").onclick = () => alignSelection("bottom");

document.getElementById("strokeW").onchange = (e) => {
  const v = parseFloat(e.target.value);
  if (isNaN(v) || v <= 0) return;
  state.strokeW = v;
  savePrefs();
  const records = strokeRecords(selectedRecords());
  if (records.length) {
    pushUndo();
    applyStrokeWidth(mergedStyleTargets(records), v, fmt);
    records.forEach((r) => {
      if (isConnGroup(r.el)) applyConnStyle(r.el);
    });
    render();
    setStatus("Grubość = " + v + " (" + records.length + " zazn.)");
  } else {
    setStatus("Zaznacz linie / przewody, aby zmienić grubość.", { toast: true, tone: "info" });
  }
};
document.getElementById("btnZoomIn").onclick = () => {
  state.zoom = Math.min(40, state.zoom * 1.2);
  applyView();
  drawHandles();
};
document.getElementById("btnZoomOut").onclick = () => {
  state.zoom = Math.max(0.5, state.zoom / 1.2);
  applyView();
  drawHandles();
};
document.getElementById("btnFit").onclick = fitView;
function fitView() {
  const node = currentSymNode();
  if (!node) return;
  let bb;
  try {
    bb = scene.host.getBBox();
  } catch (e) {
    return;
  }
  if (!bb || !isFinite(bb.width) || bb.width === 0) {
    return;
  }
  const r = stageRect();
  const m = 30;
  const z = Math.min((r.width - 2 * m) / bb.width, (r.height - 2 * m) / bb.height);
  state.zoom = Math.min(40, Math.max(0.5, z));
  state.panX = m - bb.x * state.zoom + (r.width - 2 * m - bb.width * state.zoom) / 2;
  state.panY = m - bb.y * state.zoom + (r.height - 2 * m - bb.height * state.zoom) / 2;
  applyView();
  drawHandles();
}

// ---- zapis (per aktywny cel; schemat samowystarczalny) ----
function serializeOut() {
  return serializeSvg(state.srcSvg);
}
function collectUsedSymbols(rootNode, sheetSvg) {
  return collectUsedSymbolIds(rootNode, state.lib?.svg, sheetSvg);
}
function inlineSheetDefs(sheet) {
  if (sheet?.svg) syncUseSymbolHrefs(sheet.svg, XLINK, state.lib?.svg);
  return inlineSheetDefsSafe(sheet, {
    svgNs: SVGNS,
    libSvg: state.lib?.svg,
    resolveLibSymbol: (libSvg, id) => resolveLibSymbol(libSvg, id),
    resolveSheetSymbol: (sheetSvg, id) => resolveSheetSymbol(sheetSvg, id),
    useColorAwareClone,
    collectUsedSymbols: (root, sheetSvg) => collectUsedSymbols(root, sheetSvg),
  });
}
wireSidebarLists();
wireFileIo();

function markActiveDirty() {
  if (state.active && state.active !== state.lib) markSheetDirty(state.active);
  syncDirtyIndicator();
}
function syncDirtyIndicator() {
  const n = countDirtySheets(state.sheets);
  if (statusEl) statusEl.dataset.unsaved = n > 0 ? "1" : "0";
  if (savePermBadge) savePermBadge.syncDirtyOnly();
}
function setStatus(msg, opts) {
  if (!statusEl) return;
  statusEl.textContent = msg == null ? "" : String(msg);
  syncDirtyIndicator();
  if (opts && opts.toast && msg) toastHost.show(String(msg), opts.tone || "info");
}

// ---- dodawanie/usuwanie ksztaltow ----
function clientToLocal(cx, cy) {
  const pt = stage.createSVGPoint();
  pt.x = cx;
  pt.y = cy;
  return pt.matrixTransform(scene.world.getScreenCTM().inverse());
}
function viewCenterLocal() {
  const r = stageRect();
  const p = clientToLocal(r.left + r.width / 2, r.top + r.height / 2);
  let x = p.x,
    y = p.y;
  if (state.snap) {
    x = snap(x);
    y = snap(y);
  }
  return { x, y };
}
document.getElementById("btnAddPoint").onclick = () => startDraw("point");
document.getElementById("btnAddNode").onclick = () => startDraw("node");
document.getElementById("btnAddLead").onclick = () => startDraw("lead");
function deleteActiveEl() {
  const node = currentSymNode();
  if (!node) return;
  const targets = selEls().filter((el) => el.parentNode === node);
  if (!targets.length) {
    setStatus("Zaznacz kształt (kliknij body lub uchwyt).");
    return;
  }
  pushUndo();
  targets.forEach((el) => {
    if (isWireGeometry(el)) removeWireMarksForWire(node, el);
    el.remove();
  });
  state.selection = [];
  state.activeEl = null;
  state.selHandle = null;
  clearSelInfo();
  render();
  setStatus("Usunięto: " + targets.length);
}
function addSymbol() {
  ensureLib();
  let defs = state.lib.svg.querySelector("defs");
  if (!defs) {
    defs = state.lib.svg.ownerDocument.createElementNS(SVGNS, "defs");
    state.lib.svg.insertBefore(defs, state.lib.svg.firstChild);
  }
  let n = 1,
    id;
  do {
    id = "nowy-" + n;
    n++;
  } while (resolveLibSymbol(state.lib.svg, id));
  const g = state.lib.svg.ownerDocument.createElementNS(SVGNS, "g");
  g.setAttribute("id", id);
  defs.appendChild(g);
  state.active = state.lib;
  state.srcSvg = state.lib.svg;
  state.srcDoc = state.lib.doc;
  state.fileName = state.lib.name;
  buildSymbolList();
  selectSymbol(id);
  setStatus("Dodano symbol " + id + " (pusty) do biblioteki.");
  saveProject();
}
async function deleteSymbol() {
  const sym = state.symbols.find((s) => s.id === state.selId);
  if (!sym) {
    setStatus("Zaznacz symbol w bibliotece (nie schemat).");
    return;
  }
  if (
    !(await askConfirm(W.confirm.deleteSymbol(sym.id), { title: W.dialog.deleteSymbol, okLabel: "Usuń", danger: true }))
  )
    return;
  const id = sym.id;
  sym.node.remove();
  buildSymbolList();
  const nx = state.symbols[0] ? state.symbols[0].id : state.sheets[0] ? state.sheets[0].id : null;
  if (nx) selectSymbol(nx);
  else {
    state.selId = null;
    state.selection = [];
    state.activeEl = null;
    state.selHandle = null;
    scene.host.innerHTML = "";
    scene.handles.innerHTML = "";
    clearSelInfo();
    clearHighlight();
    syncSelectionToolbar();
  }
  setStatus("Usunięto symbol " + id, { toast: true, tone: "success" });
  saveProject();
}
function symbolDependsOn(id, target, seen = new Set()) {
  if (id === target) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  const sym = state.lib && resolveLibSymbol(state.lib.svg, id);
  if (!sym) return false;
  return [...sym.querySelectorAll("use")].some((u) => {
    const child = (u.getAttribute("href") || u.getAttributeNS(XLINK, "href") || "").replace(/^#/, "");
    return child && symbolDependsOn(child, target, seen);
  });
}
function refBaseForSymbol(id, symNode) {
  const sym = symNode || resolveLibSymbol(state.lib?.svg, id);
  return refBaseForSymbolCore(id, sym);
}
function symbolOznaczenieLabel(sym) {
  if (!sym) return "";
  return symbolDesignation(sym.node, sym.id);
}
function nextInstanceRef(node, symbolId) {
  const used = new Set(
    [...node.querySelectorAll("use[data-ref]")].map((u) => u.getAttribute("data-ref")).filter(Boolean)
  );
  const { base, numbered, start } = refBaseForSymbol(symbolId);
  if (!numbered) {
    if (!used.has(base)) return base;
    let n = 2;
    while (used.has(base + n)) n++;
    return base + n;
  }
  let n = start || 1;
  while (used.has(base + n)) n++;
  return base + n;
}
function insertUse(idOverride, fromSidebar) {
  if (fromSidebar) {
    const target =
      state.lastSheet && state.sheets.includes(state.lastSheet)
        ? state.lastSheet
        : state.sheets.slice().sort((a, b) => compareListText(a.name, b.name))[0];
    if (!target) {
      setStatus("Najpierw otwórz lub utwórz schemat.");
      return;
    }
    if (state.active !== target) selectSheet(target);
  }
  const node = currentSymNode();
  if (!node) {
    setStatus("Najpierw wybierz schemat.");
    return;
  }
  const id = (idOverride || "").trim();
  if (!id) {
    setStatus("Wybierz symbol na liście po lewej i kliknij +.");
    return;
  }
  if (symbolDependsOn(id, node.id)) {
    setStatus("Nie można utworzyć cyklicznego zagnieżdżenia symboli.");
    return;
  }
  const c = viewCenterLocal();
  const u = mkEl("use", { x: c.x, y: c.y });
  u.setAttributeNS(XLINK, "xlink:href", "#" + id);
  u.setAttribute("href", "#" + id);
  const ref = nextInstanceRef(node, id);
  if (!isValidInstanceRef(ref)) {
    setStatus("Nie uda\u0142o si\u0119 wygenerowa\u0107 oznaczenia instancji.");
    return;
  }
  u.setAttribute("data-ref", ref);
  u.setAttribute("data-sym", id);
  u.style.setProperty("--object-stroke", state.strokeColor);
  pushUndo();
  node.appendChild(u);
  ensureInstanceDesigLabel(u, ref);
  const libNode = resolveLibSymbol(state.lib?.svg, id);
  const desc = libNode ? symbolDescription(libNode) : "";
  const desc2 = libNode ? symbolDescription2(libNode) : "";
  if (desc) {
    u.setAttribute("data-inst-desc", desc);
    ensureInstanceDescLabel(u, ref, desc, { label: "desc", yOff: 18 });
  }
  if (desc2) {
    u.setAttribute("data-inst-desc2", desc2);
    ensureInstanceDescLabel(u, ref, desc2, { label: "desc2", yOff: 30 });
  }
  ensureInstancePinLabels(node);
  state.selection = expandToInstanceMembers(node, [u]);
  state.activeEl = u;
  render();
  syncNameFields();
  setStatus("Wstawiono " + ref + " (<use> #" + id + ")");
}
function duplicateSymbol() {
  const sym = state.symbols.find((s) => s.id === state.selId);
  if (!sym) {
    setStatus("Zaznacz symbol w bibliotece (nie schemat).");
    return;
  }
  let defs = state.lib.svg.querySelector("defs") || state.lib.svg;
  const base = sym.id.replace(/-kopia\d*$/, "");
  let n = 1,
    id;
  do {
    id = base + "-kopia" + (n > 1 ? n : "");
    n++;
  } while (resolveLibSymbol(state.lib.svg, id));
  const c = sym.node.cloneNode(true);
  c.id = id;
  defs.appendChild(c);
  buildSymbolList();
  selectSymbol(id);
  setStatus("Zduplikowano symbol jako " + id);
  saveProject();
}
function exportSymbol() {
  const node = currentSymNode();
  if (!node) {
    setStatus("Najpierw wybierz symbol.");
    return;
  }
  let bb;
  try {
    bb = scene.host.getBBox();
  } catch (e) {
    bb = null;
  }
  const m = 8;
  const x = bb ? fmt(bb.x - m) : "-20",
    y = bb ? fmt(bb.y - m) : "-20",
    w = bb ? fmt(bb.width + 2 * m) : "200",
    h = bb ? fmt(bb.height + 2 * m) : "200";
  const styleEl =
    (state.lib && state.lib.svg && state.lib.svg.querySelector("defs style")) ||
    (state.srcSvg && state.srcSvg.querySelector("defs style"));
  // zbierz definicje wszystkich symboli (aby zagnieżdżone <use> się rozwiązały)
  let symDefs = "";
  state.symbols.forEach((s) => {
    symDefs += new XMLSerializer().serializeToString(useColorAwareClone(s.node));
  });
  const styleStr = styleEl ? new XMLSerializer().serializeToString(useColorAwareClone(styleEl)) : "";
  const body = new XMLSerializer().serializeToString(node).replace(/\sid="[^"]*"/, "");
  const out =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' +
    x +
    " " +
    y +
    " " +
    w +
    " " +
    h +
    '" width="' +
    w +
    '" height="' +
    h +
    '">\n' +
    "<defs>" +
    styleStr +
    symDefs +
    "</defs>\n" +
    body +
    "\n</svg>\n";
  const b = new Blob([out], { type: "image/svg+xml" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = node.id + ".svg";
  a.click();
  URL.revokeObjectURL(u);
  setStatus("Wyeksportowano " + node.id + ".svg");
}
document.getElementById("btnAddLine").onclick = () => startDraw("line");
document.getElementById("btnAddRect").onclick = () => startDraw("rect");
document.getElementById("btnAddCircle").onclick = () => startDraw("circle");
document.getElementById("btnAddText").onclick = () => startDraw("text");
document.getElementById("btnAddArc").onclick = () => startDraw("arc");
document.getElementById("btnClone").onclick = cloneSelection;
document.getElementById("btnDelShape").onclick = deleteActiveEl;
document.getElementById("btnSaveSymbol").onclick = saveSymbol;
document.getElementById("btnSaveResource").onclick = () => {
  saveResourceName();
};
["instPrefix", "symName", "symDesc", "symDesc2", "instStart"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveSymbol();
    }
  });
});
initSelectionPropsForm();
initRouteOptsUi();
initWireMarkModeUi();
document.addEventListener("keydown", (e) => {
  if (e.key !== "F2" || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
  if (renameSelectedListItem()) {
    e.preventDefault();
  }
});
document.getElementById("btnAddSym").onclick = addSymbol;
document.getElementById("btnDelSym").onclick = deleteSymbol;
document.getElementById("btnDupSym").onclick = duplicateSymbol;
document.getElementById("btnExportSym").onclick = exportSymbol;

// ---- dokument bazowy + styl ----
const DEFAULT_STYLE =
  "\n" +
  ".fr{fill:none;stroke:#0f172a;stroke-width:2;}\n" +
  ".fr2{fill:none;stroke:#0f172a;stroke-width:1;}\n" +
  ".ttl{font:700 22px Arial,sans-serif;fill:#0f172a;}\n" +
  ".sub{font:400 11px Arial,sans-serif;fill:#475569;}\n" +
  ".tb{font:400 11px Arial,sans-serif;fill:#0f172a;}\n" +
  ".tbb{font:700 11px Arial,sans-serif;fill:#0f172a;}\n" +
  ".cap{font:700 12px Arial,sans-serif;fill:#0f172a;}\n" +
  ".capd{font:400 10px Arial,sans-serif;fill:#475569;}\n" +
  ".cat{font:700 9px Arial,sans-serif;fill:#94a3b8;}\n" +
  ".cell{fill:#ffffff;stroke:#cbd5e1;stroke-width:1;}\n" +
  ".sym{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}\n" +
  ".symt{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}\n" +
  connAllCss() +
  ".dash{stroke-dasharray:4 3;}\n" +
  ".node{fill:#0f172a;}\n" +
  ".pin{font:400 9px Arial,sans-serif;fill:var(--object-stroke,#334155);}\n" +
  ".did{font:700 12px Arial,sans-serif;fill:var(--object-stroke,#0f172a);}\n" +
  wireCssRules() +
  "\n";
function baseDocText() {
  return emptySvgMarkup(DEFAULT_STYLE);
}
function ensureStyle() {
  if (!state.srcSvg) return;
  let defs = state.srcSvg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVGNS, "defs");
    state.srcSvg.insertBefore(defs, state.srcSvg.firstChild);
  }
  if (!defs.querySelector("style")) {
    const st = document.createElementNS(SVGNS, "style");
    st.textContent = DEFAULT_STYLE;
    defs.insertBefore(st, defs.firstChild);
  }
}

// ---- nowy schemat (arkusz A4) ----
async function newSheet() {
  ensureLib();
  if (!state.dir && !(await askConfirm(W.confirm.sheetNoProject, { title: W.dialog.newSheet }))) return;
  (async () => {
    let relPath = null;
    let saveHandle = null;
    if (state.dir && window.showSaveFilePicker) {
      saveHandle = await pickSaveLocationInProject(
        uniqueFileName(
          state.sheets.map((s) => s.relPath || s.name).map((n) => n.split("/").pop()),
          settingsCfg.sheet || "Schemat"
        ),
        "Schemat SVG"
      );
      if (saveHandle) {
        const walked = await walkDir(state.dir, { maxDepth: DEFAULT_WALK_DEPTH }).catch(() => ({ files: [] }));
        relPath = await librarySettingPathForHandle(state.dir, saveHandle, walked.files);
      }
    }
    const doc = createSheetDocument({
      styleContent: DEFAULT_STYLE,
      settingsCfg,
      existingSheetIds: state.sheets.map((s) => s.id),
      existingFileNames: state.sheets.map((s) => s.relPath || s.name),
      relPath: relPath || undefined,
    });
    if (!doc.ok) {
      setStatus(doc.message || W.create.sheetFailed);
      return;
    }
    const sheet = doc.sheet;
    state.sheets.push(sheet);
    buildSymbolList();
    selectSheet(sheet);
    if (state.dir) {
      try {
        if (await ensurePerm(state.dir)) {
          if (saveHandle) {
            sheet.handle = saveHandle;
            sheet.relPath = normalizeRelPath(relPath || saveHandle.name);
            await writeHandle(saveHandle, serializeSvg(sheet.svg));
          } else await writeSheetToProject(state.dir, sheet, writeHandle, serializeSvg);
          inlineSheetDefs(sheet);
          await saveProjectSettings();
        }
      } catch (e) {
        console.warn(e);
      }
    }
    setStatus(W.create.sheetCreated(sheetCatalogLabel(sheet), sheet.relPath || sheet.name));
    saveProject();
  })();
}
document.getElementById("btnNewSheet").onclick = newSheet;

// ---- ustawienia (formularz + trwałość) ----
function todayStr() {
  const d = new Date();
  const p = (n) => ("0" + n).slice(-2);
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
const SETTINGS_DEFAULT = {
  orient: "landscape",
  doc: "",
  serial: "",
  maker: "",
  version: "1.0",
  sheet: "",
  norm: "",
  date: "",
  library: "",
  /** SSOT połączeń: { [sheetKey]: ConnectionJson[] } */
  sheetConnections: {},
};
let settingsCfg = Object.assign({}, SETTINGS_DEFAULT);
async function loadSettings() {
  let s = null;
  try {
    s = await idbGet("settings");
  } catch (e) {}
  if (!s) {
    try {
      const t = localStorage.getItem("edytor.settings");
      if (t) s = JSON.parse(t);
    } catch (e) {}
  }
  settingsCfg = Object.assign({}, SETTINGS_DEFAULT, s || {});
  if (!settingsCfg.date) settingsCfg.date = todayStr();
  return settingsCfg;
}
function saveSettingsCfg() {
  try {
    localStorage.setItem("edytor.settings", JSON.stringify(settingsCfg));
  } catch (e) {}
  idbSet("settings", settingsCfg).catch(() => {});
}
const settingsBg = document.getElementById("settings");
settingsModal = bindModalA11y({ id: "settings", labelledBy: "settingsTitle", initialFocus: "setOrient" });
function openSettings() {
  document.getElementById("setOrient").value = settingsCfg.orient;
  document.getElementById("setDoc").value = settingsCfg.doc || "";
  document.getElementById("setSerial").value = settingsCfg.serial || "";
  document.getElementById("setMaker").value = settingsCfg.maker || "";
  document.getElementById("setVersion").value = settingsCfg.version || "";
  document.getElementById("setSheet").value = settingsCfg.sheet || "";
  document.getElementById("setNorm").value = settingsCfg.norm || "";
  document.getElementById("setDate").value = settingsCfg.date || todayStr();
  settingsModal.open();
}
function closeSettings() {
  settingsModal.close();
}
document.getElementById("btnSettings").onclick = openSettings;
document.getElementById("setCancel").onclick = closeSettings;
document.getElementById("setSave").onclick = () => {
  settingsCfg = {
    orient: document.getElementById("setOrient").value,
    doc: document.getElementById("setDoc").value.trim(),
    serial: document.getElementById("setSerial").value.trim(),
    maker: document.getElementById("setMaker").value.trim(),
    version: document.getElementById("setVersion").value.trim(),
    sheet: document.getElementById("setSheet").value.trim(),
    norm: document.getElementById("setNorm").value.trim(),
    date: document.getElementById("setDate").value.trim() || todayStr(),
  };
  saveSettingsCfg();
  closeSettings();
  if (state.dir) {
    saveProjectSettings().then((ok) =>
      setStatus(
        ok
          ? "Zapisano ustawienia do projekt.json."
          : "Zapisano ustawienia (folder: kliknij Przywróć dostęp, aby zapisać na dysk)."
      )
    );
  } else setStatus("Zapisano ustawienia (otwórz projekt, aby zapisać do projekt.json).");
  markDirty();
};
settingsBg.addEventListener("pointerdown", (e) => {
  if (e.target === settingsBg) closeSettings();
});

// ---- autozapis projektu (biblioteka + schematy) + pamięć ustawień ----
let _noSave = true,
  _docT = null,
  _prefsT = null;
let _cacheScoreFloor = 0,
  _libCacheScoreFloor = 0;
function markDirty() {
  if (_noSave) return;
  clearTimeout(_docT);
  _docT = setTimeout(persistNow, 700);
}
function projectSnapshot() {
  return {
    savedAt: Date.now(),
    dirName: state.dir?.name || null,
    sheets: state.sheets.map((s) => ({
      name: s.name,
      relPath: s.relPath || null,
      id: s.id,
      text: serializeSvg(s.svg),
    })),
    settings: settingsCfg,
    activeId: state.selId,
    activeSheetKey: prefsSheetKey({ active: state.active, lib: state.lib, lastSheet: state.lastSheet }),
    netlist: state.netlistRaw
      ? { name: (state.netlist && state.netlist.name) || "spis.md", text: state.netlistRaw }
      : null,
  };
}
function libSnapshot() {
  if (!state.lib?.svg) return null;
  return { name: state.lib.name, text: serializeSvg(state.lib.svg), savedAt: Date.now() };
}
function persistNow() {
  if (_noSave) return;
  try {
    const snap = projectSnapshot();
    let existing = null;
    try {
      const raw = localStorage.getItem("edytor.project");
      existing = raw ? JSON.parse(raw) : null;
    } catch (e) {}
    const newScore = projectCacheScore(snap);
    const oldScore = Math.max(projectCacheScore(existing), _cacheScoreFloor);
    if (newScore > 0 && newScore >= oldScore) writeJsonCache("project", "edytor.project", snap);
    else if (newScore === 0 && oldScore === 0) writeJsonCache("project", "edytor.project", snap);
  } catch (e) {}
  if (state.lib?.svg) {
    syncConnStylesInLib(state.lib.svg, SVGNS);
    const s = libSnapshot();
    if (s) {
      let existing = null;
      try {
        const raw = localStorage.getItem("edytor.lib");
        existing = raw ? JSON.parse(raw) : null;
      } catch (e) {}
      if (shouldWriteLibraryCache(s, existing, _libCacheScoreFloor)) writeJsonCache("libDoc", "edytor.lib", s);
    }
  }
}
function flushDoc() {
  persistNow();
}
function flushLibrary() {
  persistNow();
}
function saveProject() {
  if (_noSave) return;
  clearTimeout(_docT);
  persistNow();
}
function sheetsFromProjectSnapshot(proj) {
  if (!proj?.sheets?.length) return [];
  return proj.sheets
    .map((s) => {
      const p = parseSvg(s.text);
      if (!p) return null;
      return {
        handle: null,
        name: s.name,
        relPath: s.relPath || null,
        svg: p.svg,
        doc: p.doc,
        id: s.id || firstSchId(p.svg),
      };
    })
    .filter(Boolean);
}
async function applyCachedProjectMeta(proj) {
  if (!proj) return;
  if (proj.settings) settingsCfg = Object.assign({}, SETTINGS_DEFAULT, proj.settings);
  const sheet =
    typeof targetSheet === "function"
      ? targetSheet()
      : state.lastSheet && state.sheets.includes(state.lastSheet)
        ? state.lastSheet
        : state.sheets[0] || null;
  if (sheet && settingsCfg.sheetConnections && Object.keys(settingsCfg.sheetConnections).length) {
    if (typeof autoLoadNetlistForSheet === "function") {
      await autoLoadNetlistForSheet(sheet, null, { silent: true });
      return;
    }
  }
  if (proj.netlist?.text) await loadNetlistText(proj.netlist.text, proj.netlist.name, null, { silent: true });
}
async function restoreProject() {
  return restoreProjectSnapshot();
}
function prefsPayload() {
  const rot = parseFloat((document.getElementById("rotAng") || {}).value);
  return {
    step: state.step,
    snap: state.snap,
    showHandles: state.showHandles,
    rotateOwnedLabels: state.rotateOwnedLabels,
    wireMarkMode: normalizeWireMarkMode(state.wireMarkMode),
    strokeW: state.strokeW,
    strokeColor: state.strokeColor,
    fillColor: state.fillColor,
    fillOn: state.fillOn,
    dashOn: state.dashOn,
    fontSize: state.fontSize,
    fontWeight: state.fontWeight,
    rotAng: isNaN(rot) ? 90 : rot,
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    selId: state.selId,
    sheetKey: prefsSheetKey({ active: state.active, lib: state.lib, lastSheet: state.lastSheet }),
    activeIsLib: !!(state.active && state.active === state.lib),
  };
}
function writePrefsNow() {
  if (_noSave) return;
  const p = prefsPayload();
  try {
    localStorage.setItem("edytor.prefs", JSON.stringify(p));
  } catch (e) {}
  idbSet("prefs", p).catch(() => {});
}
function savePrefs() {
  if (_noSave) return;
  clearTimeout(_prefsT);
  _prefsT = setTimeout(writePrefsNow, 400);
}
async function loadPrefs() {
  let p = await restorePrefsSnapshot();
  if (!p) return null;
  const setV = (id, v) => {
    const el = document.getElementById(id);
    if (el != null && v != null) el.value = v;
  };
  const setC = (id, v) => {
    const el = document.getElementById(id);
    if (el != null && v != null) el.checked = !!v;
  };
  if (p.step != null) {
    state.step = p.step;
    setV("grid", String(p.step));
  }
  if (p.snap != null) {
    state.snap = !!p.snap;
    setC("snap", p.snap);
  }
  if (p.showHandles != null) {
    state.showHandles = !!p.showHandles;
    setC("showHandles", p.showHandles);
    if (scene.handles) scene.handles.style.display = state.showHandles ? "" : "none";
  }
  if (p.rotateOwnedLabels != null) {
    state.rotateOwnedLabels = !!p.rotateOwnedLabels;
    setC("rotateOwnedLabels", p.rotateOwnedLabels);
  }
  if (p.wireMarkMode != null) {
    state.wireMarkMode = normalizeWireMarkMode(p.wireMarkMode);
    setV("wireMarkMode", state.wireMarkMode);
  }
  if (p.strokeW != null) {
    state.strokeW = p.strokeW;
    setV("strokeW", String(p.strokeW));
  }
  if (p.strokeColor) {
    state.strokeColor = p.strokeColor;
    setV("strokeColor", p.strokeColor);
  }
  if (p.fillColor) {
    state.fillColor = p.fillColor;
    setV("fillColor", p.fillColor);
  }
  if (p.fillOn != null) {
    state.fillOn = !!p.fillOn;
    setC("fillOn", p.fillOn);
  }
  if (p.dashOn != null) {
    state.dashOn = !!p.dashOn;
    setC("dashOn", p.dashOn);
  }
  if (p.fontSize != null) {
    state.fontSize = p.fontSize;
    setV("fontSize", p.fontSize);
  }
  if (p.fontWeight != null) {
    state.fontWeight = p.fontWeight;
    setV("fontWeight", String(p.fontWeight));
  }
  if (p.rotAng != null) {
    setV("rotAng", p.rotAng);
  }
  if (p.zoom != null) state.zoom = p.zoom;
  if (p.panX != null) state.panX = p.panX;
  if (p.panY != null) state.panY = p.panY;
  return p;
}
window.addEventListener("pagehide", () => {
  clearTimeout(_prefsT);
  writePrefsNow();
  persistNow();
});
window.addEventListener("beforeunload", (e) => {
  clearTimeout(_prefsT);
  writePrefsNow();
  persistNow();
  if (countDirtySheets(state.sheets)) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    clearTimeout(_prefsT);
    writePrefsNow();
    persistNow();
  }
});
window.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (state.drawMode) {
    if (e.key === "Escape") {
      e.preventDefault();
      exitDraw();
      render();
      setStatus("Anulowano rysowanie.");
    } else if (e.key === "Enter") {
      e.preventDefault();
      void finishShape();
    }
    return;
  }
  if (state.breakEditMode && e.key === "Escape") {
    e.preventDefault();
    setBreakEditMode(false);
    setStatus("Anulowano tryb łamania.");
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    state.selection = [];
    state.activeEl = null;
    state.selHandle = null;
    clearSelInfo();
    clearHighlight();
    clearNetlistRouteHighlight();
    syncSelectionToolbar();
    render();
    setStatus("Odznaczono.");
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
    e.preventDefault();
    selectAllElements();
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (tryRemoveSelectedBreakVertex()) return;
    deleteActiveEl();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
    e.preventDefault();
    cloneSelection();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
    e.preventDefault();
    copySel();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "x" || e.key === "X")) {
    e.preventDefault();
    cutSel();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
    e.preventDefault();
    pasteClip(e.shiftKey);
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "s" || e.key === "S")) {
    e.preventDefault();
    void save();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "s" || e.key === "S")) {
    e.preventDefault();
    void saveAs();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
    e.preventDefault();
    doUndo();
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    ((e.shiftKey && (e.key === "z" || e.key === "Z")) || e.key === "y" || e.key === "Y")
  ) {
    e.preventDefault();
    doRedo();
  }
  if (!e.ctrlKey && !e.metaKey && e.key.indexOf("Arrow") === 0) {
    e.preventDefault();
    const d = e.shiftKey ? 1 : state.step;
    if (e.key === "ArrowLeft") nudge(-d, 0);
    else if (e.key === "ArrowRight") nudge(d, 0);
    else if (e.key === "ArrowUp") nudge(0, -d);
    else if (e.key === "ArrowDown") nudge(0, d);
  }
});

// ---- dostęp do dysku (po odświeżeniu wymaga gestu) ----
async function reloadLibraryFromHandle() {
  if (!state.libHandle) return false;
  try {
    const text = await (await state.libHandle.getFile()).text();
    const p = parseSvg(text);
    if (!p) return false;
    adoptLibraryFromParsed(p, state.lib?.name || state.libHandle.name, state.libHandle);
    flushLibrary();
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
async function relinkHandles(dir) {
  for (const sh of state.sheets) {
    try {
      sh.handle = sh.relPath
        ? await getFileHandleByPath(dir, sh.relPath, true)
        : await dir.getFileHandle(sh.name, { create: true });
    } catch (e) {}
  }
  try {
    const shared = await resolveSharedLibrary(dir, settingsCfg.library);
    if (shared) {
      state.libHandle = shared.handle;
      if (state.lib) state.lib.handle = shared.handle;
      settingsCfg.library = normalizeRelPath(shared.relPath);
      return;
    }
  } catch (e) {}
  if (settingsCfg.library) {
    try {
      const lh = await getFileHandleByPath(dir, settingsCfg.library);
      state.libHandle = lh;
      if (state.lib) state.lib.handle = lh;
    } catch (e) {}
  }
}
/** Nadpisuje arkusze w pamięci treścią z plików SVG na dysku (pełny skan, nie merge z cache). */
async function reloadSheetsFromDir(dir, opts = {}) {
  if (!dir) return 0;
  const prevSheets = state.sheets.slice();
  let walked;
  try {
    walked = await walkDir(dir);
  } catch (e) {
    const outcome = resolveReloadSheetsOutcome({
      diskSheets: [],
      prevSheets,
      keepExistingOnEmpty: !!opts.keepExistingOnEmpty,
    });
    state.sheets = outcome.sheets;
    return outcome.count;
  }
  const diskSheets = await applyWalkedProject(walked, { skipLib: !!opts.skipLib, skipSettings: !!opts.skipSettings });
  const outcome = resolveReloadSheetsOutcome({
    diskSheets,
    prevSheets,
    keepExistingOnEmpty: !!opts.keepExistingOnEmpty,
  });
  if (outcome.action !== "use-disk") {
    state.sheets = outcome.sheets;
    return outcome.count;
  }
  if (!opts.skipLib) await reloadLibraryFromHandle();
  migrateProjectSymbolNames();
  buildSymbolList();
  const keepSheet = findSheetByKey(
    state.sheets,
    prefsSheetKey({ active: state.active, lib: state.lib, lastSheet: state.lastSheet })
  );
  if (keepSheet) selectSheet(keepSheet, true);
  else if (state.selId && state.symbols.some((s) => s.id === state.selId)) selectSymbol(state.selId, true);
  else if (state.sheets[0]) selectSheet(state.sheets[0], true);
  else render();
  saveProject();
  return diskSheets.length;
}
async function needsPerm(h) {
  if (!h || !h.queryPermission) return false;
  try {
    return (await h.queryPermission({ mode: "readwrite" })) !== "granted";
  } catch (e) {
    return false;
  }
}
async function restoreFolderAccess() {
  let any = false,
    reloaded = 0;
  if (state.dir && (await ensurePerm(state.dir))) {
    await relinkHandles(state.dir);
    reloaded = await reloadSheetsFromDir(state.dir);
    any = true;
    if (typeof autoLoadNetlistForSheet === "function")
      await autoLoadNetlistForSheet(typeof targetSheet === "function" ? targetSheet() : null, state.dir, {
        silent: true,
      });
  }
  if (state.libHandle && (await ensurePerm(state.libHandle))) {
    if (state.lib) state.lib.handle = state.libHandle;
    any = true;
  }
  await refreshGrantButton();
  const netMsg = state.netlist ? " Spis: " + state.netlist.connections.length + " połączeń." : "";
  if (reloaded)
    setStatus("Przywrócono dostęp i zsynchronizowano " + reloaded + " schemat(ów) z dysku." + netMsg, {
      toast: true,
      tone: "success",
    });
  else
    setStatus((any ? W.toast.permRestored : W.toast.permDenied) + netMsg, {
      toast: true,
      tone: any ? "success" : "warning",
    });
}
async function refreshGrantButton() {
  const b = document.getElementById("btnGrant");
  if (b) b.style.display = "none";
  if (!savePermBadge) {
    savePermBadge = createSavePermBadge({
      getState: () => state,
      countDirtySheets,
      needsPerm,
      badgeEl: document.getElementById("saveBadge"),
      labelEl: document.getElementById("saveBadgeLabel"),
    });
  }
  const view = await savePermBadge.sync();
  if (!view.kind || view.kind !== "perm") {
    if (state.dir && !(await needsPerm(state.dir))) await relinkHandles(state.dir);
  }
}
function showGrantIfNeeded() {
  return refreshGrantButton();
}
document.getElementById("btnGrant").onclick = () => {
  void restoreFolderAccess();
};
const saveBadgeEl = document.getElementById("saveBadge");
if (saveBadgeEl)
  saveBadgeEl.addEventListener("click", () => {
    const kind = saveBadgeEl.dataset.kind;
    if (kind === "perm") void restoreFolderAccess();
    else if (kind === "dirty") void save();
  });

// init
scene = createStageLayers(stage, SVGNS);
applyStaticWording();
syncDrawBanner = createDrawBannerSync({
  drawBannerEl,
  toolbarEl,
  getDrawMode: () => state.drawMode,
  onToolbarSync: () => syncToolbarContext(),
});
bindShortcutsHelp();
(function wireMoreMenu() {
  const btn = document.getElementById("btnFileMenu");
  const panel = document.getElementById("fileMenu");
  const group = document.getElementById("fileGroup");
  if (!btn || !panel) return;
  const setOpen = (open) => {
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && group) {
      const gRect = group.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      panel.style.left = Math.max(0, bRect.left - gRect.left) + "px";
    }
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!panel.classList.contains("open"));
  });
  document.addEventListener("pointerdown", (e) => {
    if (!panel.classList.contains("open")) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) setOpen(false);
  });
  panel.addEventListener("click", (e) => {
    if (e.target.closest("button")) setOpen(false);
  });
})();
const emptyOpen = document.getElementById("btnEmptyOpenProject");
if (emptyOpen)
  emptyOpen.onclick = () => {
    document.getElementById("btnOpen")?.click();
  };
try {
  bootstrapEditorSync({
    injectIcons,
    initConnMetaModal,
    wireHistory,
    wireConnModel,
    wireProjectMigrate,
    wireRenderPipeline,
    scene,
    applyView,
    drawGrid,
    wireNetlistRouting,
    wireSelectionModel,
    syncSelectionToolbar,
    syncToolbarContext,
    refreshNetlistUI,
    routeConnButton: document.getElementById("btnRouteConn"),
    routeAllConnButton: document.getElementById("btnRouteAllConn"),
    breakPointButton: document.getElementById("btnBreakPoint"),
    getRouteSelectedConnection: () => routeSelectedConnection,
    getRouteAllConnections: () => routeAllConnections,
    toggleBreakEditMode,
  });
} catch (e) {
  console.error("Błąd inicjalizacji edytora:", e);
  setStatus("Błąd inicjalizacji: " + (e.message || e), { toast: true, tone: "danger" });
}
(async function boot() {
  try {
    const prefs = await loadPrefs();
    await loadSettings();
    try {
      const d = await idbGet("dir");
      if (d) state.dir = d;
    } catch (e) {}
    try {
      const lh = await idbGet("libHandle");
      if (lh) {
        state.libHandle = lh;
      }
    } catch (e) {}

    const cachedProj = await restoreProject();
    const cachedSheets = sheetsFromProjectSnapshot(cachedProj);
    _cacheScoreFloor = projectCacheScore(cachedProj);

    if (cachedSheets.length) state.sheets = cachedSheets;
    if (cachedProj) await applyCachedProjectMeta(cachedProj);

    const cachedLib = await restoreLibrary();
    _libCacheScoreFloor = libraryCacheScore(cachedLib);
    if (cachedLib) {
      const p = parseSvg(cachedLib.text);
      if (p) adoptLibraryFromParsed(p, cachedLib.name || "E-00_symbole.svg", state.libHandle || null);
    }

    let loadedFromDisk = false;
    if (state.dir && (await hasPerm(state.dir))) {
      await relinkHandles(state.dir);
      loadedFromDisk = (await reloadSheetsFromDir(state.dir, { keepExistingOnEmpty: true })) > 0;
      if (loadedFromDisk && typeof autoLoadNetlistForSheet === "function") {
        await autoLoadNetlistForSheet(typeof targetSheet === "function" ? targetSheet() : null, state.dir, {
          silent: true,
        });
      }
    }

    const hasLibrary = !!(state.lib && state.lib.svg && hasLibSymbols(state.lib.svg));
    const needCache = resolveBootCachePlan({ loadedFromDisk, sheetCount: state.sheets.length, hasLibrary });
    if (needCache.needCacheLib && !hasLibrary) {
      if (!cachedLib) {
        const libS = await restoreLibrary();
        if (libS) {
          const p = parseSvg(libS.text);
          if (p) adoptLibraryFromParsed(p, libS.name || "E-00_symbole.svg", null);
        }
      }
      if (state.libHandle && state.lib) state.lib.handle = state.libHandle;
    }
    if (needCache.needCacheSheets && !state.sheets.length && cachedSheets.length) {
      state.sheets = cachedSheets;
      if (cachedProj) await applyCachedProjectMeta(cachedProj);
    }

    ensureLib();
    migrateProjectSymbolNames();
    buildSymbolList();
    const keepView = !!(prefs && prefs.zoom != null);
    const bootTarget = resolveBootActiveTarget({
      sheets: state.sheets,
      symbols: state.symbols,
      prefs,
      projectSheetKey: cachedProj?.activeSheetKey || null,
      projectActiveId: cachedProj?.activeId || null,
    });
    if (bootTarget.kind === "sheet" && bootTarget.sheet) {
      selectSheet(bootTarget.sheet, keepView);
    } else if (bootTarget.kind === "symbol" && bootTarget.symbolId) {
      selectSymbol(bootTarget.symbolId, keepView);
    } else {
      state.active = state.lib;
      state.srcSvg = state.lib.svg;
      state.srcDoc = state.lib.doc;
      render();
    }
    const restoredFromCache = !loadedFromDisk && state.sheets.length > 0;
    const dirHint = cachedProj?.dirName || state.dir?.name;
    const bootUi = resolveBootStatusMessage({
      loadedFromDisk,
      sheetCount: state.sheets.length,
      libraryLabel: settingsCfg.library || state.lib?.name || "?",
      restoredFromCache,
      dirHint,
      hasDir: !!state.dir,
    });
    setStatus(bootUi.message, { toast: bootUi.toast, tone: bootUi.tone });
    _noSave = false;
    persistNow();
    savePrefs();
    await refreshGrantButton();
    if (state.netlist && typeof refreshNetlistUI === "function") refreshNetlistUI();
  } catch (e) {
    console.error("Błąd wczytywania projektu:", e);
    setStatus("Błąd wczytywania: " + (e.message || e), { toast: true, tone: "danger" });
  }
})();
