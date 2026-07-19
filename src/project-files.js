/** Konwencja powiązań plików projektu (nazwa arkusza ↔ spis połączeń ↔ biblioteka). */

export function sheetBasename(nameOrSheet) {
  const name = typeof nameOrSheet === "string" ? nameOrSheet : nameOrSheet?.name || "";
  return name.replace(/\.svg$/i, "").trim();
}

/** Porównanie nazw plików niezależne od polskich znaków (Bezpieczeństwo ↔ Bezpieczenstwo). */
export function foldFileName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function netlistNamesForSheet(sheetName) {
  const base = sheetBasename(sheetName);
  if (!base) return [];
  return [`polaczenia_${base}.md`, `polaczenia-${base}.md`];
}

export const LIBRARY_FILE_NAMES = ["E-00_symbole.svg", "E-00.svg"];
export const LIBRARY_DIR = "lib";

/** Ścieżki względem katalogu projektu lub workspace (do wyszukiwania biblioteki). */
export function librarySearchRelPaths(settingsLibrary) {
  const out = [];
  if (settingsLibrary) out.push(normalizeRelPath(settingsLibrary));
  for (const rel of libraryRelPaths()) {
    if (!out.includes(rel)) out.push(rel);
  }
  return out;
}

/** Nazwy plików biblioteki w katalogu lib/ (do wyszukiwania w folderach nadrzędnych). */
export function librarySharedRelPaths() {
  const out = [];
  for (const name of LIBRARY_FILE_NAMES) {
    out.push(`${LIBRARY_DIR}/${name}`, name);
  }
  return out;
}

export function libraryRelPaths() {
  const paths = [];
  LIBRARY_FILE_NAMES.forEach((n) => {
    paths.push(n, `${LIBRARY_DIR}/${n}`, `../${LIBRARY_DIR}/${n}`);
  });
  return paths;
}

export function normalizeRelPath(p) {
  return (p || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

export function parentRelPath(relPath) {
  const p = normalizeRelPath(relPath);
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

export async function walkDir(dir, opts = {}) {
  const maxDepth = opts.maxDepth ?? 12;
  const files = [];
  const dirs = [];

  async function walk(handle, relPath, depth) {
    if (depth > maxDepth) return;
    for await (const [name, entry] of handle.entries()) {
      const rp = relPath ? `${relPath}/${name}` : name;
      if (entry.kind === "file") {
        files.push({ name, relPath: rp, handle: entry, dirHandle: handle });
      } else if (entry.kind === "directory") {
        dirs.push({ name, relPath: rp, handle: entry });
        await walk(entry, rp, depth + 1);
      }
    }
  }

  await walk(dir, "", 0);
  return { files, dirs, root: dir };
}

export async function getFileHandleByPath(rootDir, relPath, create = false) {
  const parts = normalizeRelPath(relPath).split("/").filter(Boolean);
  if (!parts.length) throw new Error("empty path");
  let dir = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }
  return dir.getFileHandle(parts[parts.length - 1], create ? { create: true } : undefined);
}

/**
 * Rozwiązuje ścieżkę względną (w tym ../) względem folderu projektu przez getParent().
 */
export async function resolvePathViaParents(baseDir, relPath) {
  const norm = normalizeRelPath(relPath);
  if (!norm) return null;
  if (!norm.includes("..")) {
    try {
      const handle = await getFileHandleByPath(baseDir, norm);
      return { handle, relPath: norm };
    } catch {
      return null;
    }
  }
  const parts = norm.split("/").filter(Boolean);
  let dir = baseDir;
  const tail = [];
  for (const p of parts) {
    if (p === "..") {
      if (typeof dir.getParent !== "function") return null;
      dir = await dir.getParent();
      if (!dir) return null;
    } else if (p !== ".") {
      tail.push(p);
    }
  }
  if (!tail.length) return null;
  try {
    const handle = await getFileHandleByPath(dir, tail.join("/"));
    return { handle, relPath: norm };
  } catch {
    return null;
  }
}

export function pickNetlistForSheet(netlists, sheet) {
  if (!netlists?.length || !sheet) return null;
  const want = new Set(netlistNamesForSheet(sheet.name).map((n) => foldFileName(n)));
  let pick = netlists.find((f) => want.has(foldFileName(f.name)));
  if (!pick) {
    const base = foldFileName(sheetBasename(sheet));
    if (base) pick = netlists.find((f) => foldFileName(f.name).includes(base));
  }
  return pick || null;
}

export function netlistsForSheet(netlists, sheet) {
  if (!netlists?.length || !sheet) return netlists || [];
  const sheetDir = parentRelPath(sheet.relPath || sheet.name);
  const local = netlists.filter((f) => parentRelPath(f.relPath || f.name) === sheetDir);
  return local.length ? local : netlists;
}

export function pickLibraryFile(svgFiles, settingsLibrary) {
  if (!svgFiles?.length) return null;
  const norm = (p) => normalizeRelPath(p);
  if (settingsLibrary) {
    const wanted = norm(settingsLibrary);
    const byPath = svgFiles.find((f) => norm(f.relPath) === wanted);
    if (byPath) return byPath;
    const bySuffix = svgFiles.find((f) => norm(f.relPath).endsWith(wanted) || f.name === wanted);
    if (bySuffix) return bySuffix;
  }
  for (const rel of libraryRelPaths()) {
    const hit = svgFiles.find((f) => norm(f.relPath) === rel);
    if (hit) return hit;
  }
  return svgFiles.find((f) => /E-00/i.test(f.name) && !f.isSheet) || null;
}

/** Przechodzi w górę drzewa katalogów (getParent), jeśli przeglądarka na to pozwala. */
export async function ascendDirectoryHandles(dir, maxSteps = 6) {
  const chain = [dir];
  let current = dir;
  for (let i = 0; i < maxSteps; i++) {
    if (typeof current.getParent !== "function") break;
    try {
      current = await current.getParent();
      if (!current) break;
      chain.push(current);
    } catch {
      break;
    }
  }
  return chain;
}

/**
 * Szuka wspólnej biblioteki: w folderze projektu, potem w katalogach nadrzędnych (np. schematy/lib/).
 * Umożliwia otwarcie folderu konkretnego projektu (CS-TB-48/) zamiast całego schematy/.
 */
export async function resolveSharedLibrary(projectDir, settingsLibrary) {
  if (!projectDir) return null;

  if (settingsLibrary) {
    const viaSettings = await resolvePathViaParents(projectDir, settingsLibrary);
    if (viaSettings) return { ...viaSettings, scope: "settings" };
  }

  const search = librarySearchRelPaths(settingsLibrary);
  const local = search.filter((p) => !p.includes(".."));
  for (const rel of local) {
    try {
      const handle = await getFileHandleByPath(projectDir, rel);
      return { handle, relPath: rel, scope: "project" };
    } catch {
      /* next */
    }
  }
  const shared = librarySharedRelPaths();
  const roots = await ascendDirectoryHandles(projectDir);
  for (const root of roots) {
    for (const rel of shared) {
      try {
        const handle = await getFileHandleByPath(root, rel);
        return { handle, relPath: rel, scope: "ancestor" };
      } catch {
        /* next */
      }
    }
  }
  return null;
}
