import { getFileHandleByPath, resolveSharedLibrary } from "./project-files.js";
import { reportRecoverableError } from "./recoverable-error.js";
import { status } from "./ui-wording.js";

/**
 * Ponowne powiązanie biblioteki po F5 / przywróceniu grantu.
 * Błąd wyszukania albo ścieżki z settings: console.warn + toast, potem fallback.
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
  if (libraryPath) {
    try {
      const handle = await getByPath(dir, libraryPath);
      if (handle) return { handle };
    } catch (e) {
      reportRecoverableError(e, status.relinkLibraryFailed, setStatus);
    }
  }
  return {};
}
