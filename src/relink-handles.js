import { getFileHandleByPath, normalizeRelPath, resolveSharedLibrary } from "./project-files.js";
import { reportRecoverableError } from "./recoverable-error.js";
import { status } from "./ui-wording.js";

function pathHasParentSegment(relPath) {
  return normalizeRelPath(relPath)
    .split("/")
    .some((p) => p === ".." || p === ".");
}

function isExpectedHandleMiss(err) {
  const name = err?.name || "";
  const msg = String(err?.message || "");
  return name === "NotFoundError" || name === "NotAllowedError" || /path escapes|empty path/i.test(msg);
}

/**
 * Ponowne powiązanie biblioteki po F5 / przywróceniu grantu.
 * `../lib` tylko przez resolveSharedLibrary. Brak pliku = cisza (zostaje cache / idb).
 */
export async function relinkLibraryHandles(
  dir,
  libraryPath,
  { resolveShared = resolveSharedLibrary, getByPath = getFileHandleByPath, setStatus } = {}
) {
  try {
    const shared = await resolveShared(dir, libraryPath);
    if (shared) return { shared };
  } catch (e) {
    reportRecoverableError(e, status.relinkSharedLibraryFailed, setStatus);
  }
  if (libraryPath && !pathHasParentSegment(libraryPath)) {
    try {
      const handle = await getByPath(dir, libraryPath);
      if (handle) return { handle };
    } catch (e) {
      if (isExpectedHandleMiss(e)) return {};
      reportRecoverableError(e, status.relinkLibraryFailed, setStatus);
    }
  }
  return {};
}
