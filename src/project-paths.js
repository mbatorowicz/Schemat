/** Ścieżki w projekcie — dowolny układ folderów, względne odnośniki w projekt.json. */

import { normalizeRelPath, LIBRARY_FILE_NAMES, LIBRARY_DIR, walkDir } from "./project-files.js";

export const DEFAULT_WALK_DEPTH = 12;

/** Domyślna biblioteka: w katalogu projektu (bez wymuszania lib/). */
export function defaultLibraryRelPath(fileName) {
  return normalizeRelPath(fileName || LIBRARY_FILE_NAMES[0]);
}

/** Kolejność szukania biblioteki — płasko, lib/, folder nadrzędny. */
export function libraryDiscoveryRelPaths(settingsLibrary) {
  const out = [];
  const add = (p) => {
    const n = normalizeRelPath(p);
    if (n && !out.includes(n)) out.push(n);
  };
  if (settingsLibrary) add(settingsLibrary);
  for (const name of LIBRARY_FILE_NAMES) {
    add(name);
    add(`${LIBRARY_DIR}/${name}`);
    add(`../${LIBRARY_DIR}/${name}`);
  }
  return out;
}

/** Istniejące pliki biblioteki (SVG niebędące schematami) w drzewie projektu. */
export function existingLibrarySvgNames(walkedFiles, sheetRelPaths = new Set()) {
  const names = [];
  for (const f of walkedFiles || []) {
    if (!/\.svg$/i.test(f.name)) continue;
    const rel = normalizeRelPath(f.relPath || f.name);
    if (sheetRelPaths.has(rel)) continue;
    names.push(f.name);
  }
  return names;
}

export function sheetRelPathSet(sheets) {
  return new Set((sheets || []).map((s) => normalizeRelPath(s.relPath || s.name)));
}

/**
 * Znajdź względną ścieżkę pliku w projekcie po uchwycie (skan drzewa).
 * Gdy plik jest poza projektem — zwraca samą nazwę pliku (link przez libHandle / idb).
 */
export async function findRelPathInProject(rootDir, targetHandle, opts = {}) {
  if (!rootDir || !targetHandle) return targetHandle?.name || "";
  const walked = await walkDir(rootDir, { maxDepth: opts.maxDepth ?? DEFAULT_WALK_DEPTH });
  for (const f of walked.files) {
    if (f.handle === targetHandle) return normalizeRelPath(f.relPath || f.name);
  }
  const targetName = targetHandle.name;
  const sameName = walked.files.filter((f) => f.name === targetName);
  if (sameName.length === 1) return normalizeRelPath(sameName[0].relPath || sameName[0].name);
  return targetName;
}

/** Zapisz w projekt.json ścieżkę do biblioteki (względną w projekcie lub ../ poza nim). */
export async function librarySettingPathForHandle(projectDir, fileHandle, walkedFiles) {
  if (!projectDir || !fileHandle) return fileHandle?.name || "";
  if (walkedFiles?.length) {
    for (const f of walkedFiles) {
      if (f.handle === fileHandle) return normalizeRelPath(f.relPath || f.name);
    }
    const byName = walkedFiles.filter((f) => f.name === fileHandle.name);
    if (byName.length === 1) return normalizeRelPath(byName[0].relPath || byName[0].name);
  }
  return findRelPathInProject(projectDir, fileHandle);
}
