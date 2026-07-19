/** Tworzenie nowego projektu, biblioteki symboli i schematu w projekcie. */

import {
  emptySvgMarkup,
  uniqueFileName,
  uniqueLibraryFileName,
  nextSheetGroupId,
  buildSheetGroup,
  projectSettingsForNewProject,
  DEFAULT_LIBRARY_FILE,
} from "./document-scaffold.js";
import { normalizeRelPath, getFileHandleByPath } from "./project-files.js";
import { defaultLibraryRelPath } from "./project-paths.js";
import { prepareLibrarySvg } from "./library-loader.js";
import { parseSvg, serializeSvg } from "./svg-utils.js";

/**
 * @param {{ styleContent: string, svgNs: string }} opts
 */
export function parseEmptyLibrary(opts) {
  const parsed = parseSvg(emptySvgMarkup(opts.styleContent));
  if (!parsed) return null;
  prepareLibrarySvg(parsed, opts.svgNs);
  return parsed;
}

/**
 * @param {{ styleContent: string, settingsCfg: object, existingSheetIds?: string[], title?: string, fileBase?: string, existingFileNames?: string[], relPath?: string }} opts
 */
export function createSheetDocument(opts) {
  const parsed = parseSvg(emptySvgMarkup(opts.styleContent));
  if (!parsed) return { ok: false, message: "Nie udało się utworzyć dokumentu schematu." };

  const cfg = { ...opts.settingsCfg };
  if (opts.title) cfg.doc = opts.title;

  const base = (opts.fileBase || cfg.sheet || "schemat").replace(/[^\w\-]+/g, "_") || "schemat";
  const fileName = uniqueFileName(
    (opts.existingFileNames || []).map((n) => n.split("/").pop()),
    base,
    ".svg"
  );
  const name = opts.relPath ? normalizeRelPath(opts.relPath) : fileName;
  const fileBaseName = (name.split("/").pop() || name).replace(/\.svg$/i, "");
  /** Nazwa arkusza = plik; tytuł dokumentu (cfg.doc) zostaje w .ttl ramki. */
  cfg.sheet = opts.fileBase || fileBaseName || cfg.sheet || "Schemat";

  const id = nextSheetGroupId(opts.existingSheetIds, parsed.svg);
  parsed.svg.appendChild(buildSheetGroup(id, cfg));

  return {
    ok: true,
    sheet: {
      handle: null,
      name: name.split("/").pop() || name,
      relPath: name,
      svg: parsed.svg,
      doc: parsed.doc,
      id,
      dirty: true,
    },
    id,
    name,
  };
}

async function writeFileAtRelPath(dir, relPath, writeHandle, content) {
  const norm = normalizeRelPath(relPath);
  const handle = await getFileHandleByPath(dir, norm, true);
  await writeHandle(handle, content);
  return { handle, relPath: norm };
}

/**
 * Zapisuje pustą bibliotekę pod dowolną ścieżką względem folderu projektu.
 * @param {{ dir: FileSystemDirectoryHandle, relPath: string, writeHandle: Function, styleContent: string, svgNs: string }} opts
 */
export async function createLibraryAtRelPath(opts) {
  const { dir, writeHandle, styleContent, svgNs, relPath } = opts;
  if (!dir || !writeHandle || !relPath) return { ok: false, message: "Brak folderu projektu lub ścieżki." };

  const parsed = parseEmptyLibrary({ styleContent, svgNs });
  if (!parsed) return { ok: false, message: "Nie udało się utworzyć biblioteki." };

  const { handle, relPath: norm } = await writeFileAtRelPath(dir, relPath, writeHandle, serializeSvg(parsed.svg));
  const baseName = norm.split("/").pop() || norm;

  return {
    ok: true,
    handle,
    name: baseName,
    relPath: norm,
    parsed,
  };
}

/**
 * Nowa biblioteka w projekcie — domyślnie w katalogu projektu (dowolna ścieżka przez relPath).
 */
export async function createLibraryInProject(opts) {
  const { dir, writeHandle, styleContent, svgNs } = opts;
  if (!dir || !writeHandle) return { ok: false, message: "Brak folderu projektu." };

  const fileName = uniqueLibraryFileName(opts.existingNames);
  const relPath = opts.relPath || defaultLibraryRelPath(fileName);

  return createLibraryAtRelPath({ dir, writeHandle, styleContent, svgNs, relPath });
}

/**
 * Zapisuje pustą bibliotekę przez showSaveFilePicker (poza projektem).
 */
export async function createLibraryStandalone(opts) {
  const { styleContent, svgNs, writeHandle, showSaveFilePicker } = opts;
  if (!showSaveFilePicker) return { ok: false, message: "Przeglądarka nie obsługuje zapisu pliku." };

  const parsed = parseEmptyLibrary({ styleContent, svgNs });
  if (!parsed) return { ok: false, message: "Nie udało się utworzyć biblioteki." };

  let handle;
  try {
    handle = await showSaveFilePicker({
      suggestedName: DEFAULT_LIBRARY_FILE,
      types: [{ description: "Biblioteka symboli SVG", accept: { "image/svg+xml": [".svg"] } }],
    });
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, aborted: true };
    return { ok: false, message: e?.message || "Anulowano zapis biblioteki." };
  }

  await writeHandle(handle, serializeSvg(parsed.svg));
  return { ok: true, handle, name: handle.name, parsed };
}

/**
 * Inicjalizuje nowy projekt w wybranym folderze.
 * @param {{ dir: FileSystemDirectoryHandle, writeHandle: Function, styleContent: string, svgNs: string, todayStr: Function, createFirstSheet?: boolean }} opts
 */
export async function initializeNewProjectOnDisk(opts) {
  const { dir, writeHandle, styleContent, svgNs, todayStr } = opts;
  if (!dir || !writeHandle) return { ok: false, message: "Brak folderu projektu." };

  const settings = projectSettingsForNewProject(dir.name, {
    date: todayStr(),
    doc: dir.name || "",
  });

  const lib = await createLibraryInProject({
    dir,
    writeHandle,
    styleContent,
    svgNs,
    existingNames: [],
  });
  if (!lib.ok) return lib;

  settings.library = lib.relPath;

  const projHandle = await dir.getFileHandle("projekt.json", { create: true });
  await writeHandle(projHandle, JSON.stringify(settings, null, 2));

  let firstSheet = null;
  if (opts.createFirstSheet !== false) {
    const sheetDoc = createSheetDocument({
      styleContent,
      settingsCfg: settings,
      existingSheetIds: [],
      title: settings.doc,
      fileBase: "Schemat",
      existingFileNames: [],
    });
    if (sheetDoc.ok) {
      const shHandle = await dir.getFileHandle(sheetDoc.name, { create: true });
      await writeHandle(shHandle, serializeSvg(sheetDoc.sheet.svg));
      firstSheet = { ...sheetDoc.sheet, handle: shHandle, dirty: false };
    }
  }

  return {
    ok: true,
    settings,
    library: lib,
    firstSheet,
    message: `Utworzono projekt „${dir.name}” (biblioteka + ${firstSheet ? "1 schemat" : "bez schematu"}).`,
  };
}

export async function isDirectoryEmpty(dir) {
  for await (const _ of dir.entries()) return false;
  return true;
}

export async function writeSheetToProject(dir, sheet, writeHandle, serializeSvg) {
  if (!dir || !sheet) return false;
  const name = sheet.relPath || sheet.name;
  const parts = name.split("/");
  let parent = dir;
  for (let i = 0; i < parts.length - 1; i++) {
    parent = await parent.getDirectoryHandle(parts[i], { create: true });
  }
  const handle = await parent.getFileHandle(parts[parts.length - 1], { create: true });
  await writeHandle(handle, serializeSvg(sheet.svg));
  sheet.handle = handle;
  sheet.dirty = false;
  return true;
}
