/** Rename plików projektu / schematu / biblioteki na dysku. */

import { normalizeRelPath } from "./project-files.js";
import { status as Wstatus } from "./ui-wording.js";

export function sheetBaseNameFromInput(v) {
  const s = String(v || "")
    .trim()
    .replace(/\.svg$/i, "");
  if (!s) return { ok: false, message: Wstatus.resourceEmpty };
  if (!/^[\p{L}\p{N}_\-]+$/u.test(s)) return { ok: false, message: Wstatus.resourceInvalidSheet };
  return { ok: true, value: s };
}

export function libraryFileNameFromInput(v) {
  const s = String(v || "").trim();
  if (!s) return { ok: false, message: Wstatus.resourceEmpty };
  if (!/\.svg$/i.test(s)) return { ok: false, message: Wstatus.resourceInvalidLibrary };
  if (/[\\/]/.test(s)) return { ok: false, message: Wstatus.resourceInvalidProject };
  return { ok: true, value: s };
}

export function projectFolderNameFromInput(v) {
  const s = String(v || "").trim();
  if (!s) return { ok: false, message: Wstatus.resourceEmpty };
  if (/[\\/]/.test(s)) return { ok: false, message: Wstatus.resourceInvalidProject };
  return { ok: true, value: s };
}

async function tryHandleMove(handle, newName, parentDir) {
  if (!handle?.move) return false;
  try {
    if (parentDir) await handle.move(parentDir, newName);
    else await handle.move(newName);
    return true;
  } catch {
    return false;
  }
}

async function getParentDirForRelPath(rootDir, relPath) {
  const parts = normalizeRelPath(relPath).split("/").filter(Boolean);
  parts.pop();
  let dir = rootDir;
  for (const p of parts) dir = await dir.getDirectoryHandle(p);
  return dir;
}

async function renameFileViaCopy(dir, oldHandle, oldRelPath, newFileName, readWrite) {
  const { writeHandle, getFileHandleByPath } = readWrite;
  const text = await (await oldHandle.getFile()).text();
  const dirPath = oldRelPath.includes("/") ? oldRelPath.replace(/\/[^/]+$/, "") : "";
  const newRel = dirPath ? `${dirPath}/${newFileName}` : newFileName;
  const newHandle = dirPath
    ? await getFileHandleByPath(dir, newRel, true)
    : await dir.getFileHandle(newFileName, { create: true });
  await writeHandle(newHandle, text);
  try {
    const parent = await getParentDirForRelPath(dir, oldRelPath || oldHandle.name);
    await parent.removeEntry(oldHandle.name);
  } catch {
    /* ignore */
  }
  return { handle: newHandle, relPath: normalizeRelPath(newRel) };
}

export async function renameLibraryOnDisk({ lib, newFileName, dir, settingsCfg, readWrite }) {
  const parsed = libraryFileNameFromInput(newFileName);
  if (!parsed.ok) return parsed;
  if (lib.name === parsed.value) return { ok: true, unchanged: true, lib };

  const oldName = lib.name;
  const oldHandle = lib.handle;
  if (!oldHandle || !dir) return { ok: false, message: "Brak uchwytu pliku biblioteki." };

  const moved = await tryHandleMove(oldHandle, parsed.value);
  if (!moved) {
    const oldRel = settingsCfg.library || lib.name;
    const rw = await renameFileViaCopy(dir, oldHandle, oldRel, parsed.value, readWrite);
    lib.handle = rw.handle;
    settingsCfg.library = rw.relPath;
  } else {
    const dirPart = settingsCfg.library?.includes("/") ? settingsCfg.library.replace(/\/[^/]+$/, "/") : "";
    settingsCfg.library = normalizeRelPath(dirPart + parsed.value);
  }

  lib.name = parsed.value;
  return { ok: true, lib, message: Wstatus.libraryRenamed(oldName, parsed.value) };
}

export async function renameProjectFolderOnDisk({ dir, newName, idbSet }) {
  const parsed = projectFolderNameFromInput(newName);
  if (!parsed.ok) return parsed;
  if (dir.name === parsed.value) return { ok: true, unchanged: true, dir };

  const oldName = dir.name;
  const moved = await tryHandleMove(dir, parsed.value);
  if (moved) {
    return { ok: true, dir, message: Wstatus.projectRenamed(oldName, parsed.value) };
  }

  if (typeof window !== "undefined" && window.showDirectoryPicker) {
    try {
      const parent = await window.showDirectoryPicker({ mode: "readwrite", startIn: dir });
      await dir.move(parent, parsed.value);
      const newDir = await parent.getDirectoryHandle(parsed.value);
      if (idbSet) await idbSet("dir", newDir);
      return { ok: true, dir: newDir, message: Wstatus.projectRenamed(oldName, parsed.value) };
    } catch {
      /* user abort or API failure */
    }
  }

  return { ok: false, message: Wstatus.projectRenameFailed };
}
