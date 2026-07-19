import { serializeSvg } from "./svg-utils.js";
import { inlineSheetDefsSafe, clearSheetDirty } from "./sheet-persistence.js";
import { auditSymbolsOnSheet } from "./symbol-service.js";
import { qsById } from "./dom-selectors.js";

/**
 * Zapis plików i uprawnienia File System Access API — wydzielone z main.js.
 */
export function createFileIo(deps) {
  const {
    getState,
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
    onDirtyChange,
    validateBeforeSave,
  } = deps;

  async function hasPerm(handle) {
    if (!handle?.queryPermission) return false;
    try {
      return (await handle.queryPermission({ mode: "readwrite" })) === "granted";
    } catch (e) {
      return false;
    }
  }

  async function ensurePerm(handle) {
    if (!handle) return false;
    if (handle.queryPermission) {
      let p = await handle.queryPermission({ mode: "readwrite" });
      if (p !== "granted" && handle.requestPermission) {
        p = await handle.requestPermission({ mode: "readwrite" });
      }
      return p === "granted";
    }
    return true;
  }

  async function writeHandle(handle, text) {
    const w = await handle.createWritable();
    await w.write(text);
    await w.close();
  }

  function downloadSvg(text, filename) {
    const b = new Blob([text], { type: "image/svg+xml" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(u);
  }

  async function saveFile() {
    const state = getState();
    const act = state.active;
    if (!act?.svg) return;
    let r = null;
    if (act !== state.lib) {
      r = inlineSheetDefs(act);
      const sch = qsById(act.svg, act.id);
      const audit = auditSymbolsOnSheet(sch, state.lib?.svg, act.svg, XLINK);
      if (!audit.ok) console.warn("Zapis: brak definicji w bibliotece:", audit.missing.join(", "));
      if (r.missing?.length) console.warn("Zapis: inline brak symboli:", r.missing.join(", "));
    }
    if (act.handle && (await ensurePerm(act.handle))) {
      try {
        await writeHandle(act.handle, serializeSvg(act.svg));
        if (act !== state.lib) clearSheetDirty(act);
        if (typeof onDirtyChange === "function") onDirtyChange();
        const warn = r?.missing?.length ? " (ostrzeżenie: brak symboli " + r.missing.join(", ") + ")" : "";
        setStatus((act === state.lib ? "Zapisano bibliotekę " : "Zapisano schemat ") + act.name + warn, {
          toast: true,
          tone: warn ? "warning" : "success",
        });
        flushDoc();
        return;
      } catch (e) {
        console.warn(e);
      }
    }
    return saveAs();
  }

  async function saveAs() {
    const state = getState();
    const act = state.active;
    if (!act?.svg) return;
    let r = null;
    if (act !== state.lib) r = inlineSheetDefs(act);
    const text = serializeSvg(act.svg);
    if (window.showSaveFilePicker) {
      try {
        const h = await window.showSaveFilePicker({
          suggestedName: act.name || "plik.svg",
          types: [{ description: "SVG", accept: { "image/svg+xml": [".svg"] } }],
        });
        act.handle = h;
        act.name = h.name;
        state.fileName = h.name;
        await writeHandle(h, text);
        if (act === state.lib) {
          state.libHandle = h;
          idbSet("libHandle", h).catch(() => {});
          flushLibrary();
        }
        if (act !== state.lib) clearSheetDirty(act);
        buildSymbolList();
        syncListSelection();
        const warn = r?.missing?.length ? " (ostrzeżenie: brak symboli " + r.missing.join(", ") + ")" : "";
        setStatus("Zapisano jako " + h.name + warn);
        flushDoc();
        return;
      } catch (e) {
        if (e.name !== "AbortError") console.warn(e);
        return;
      }
    }
    downloadSvg(text, act.name || "plik.svg");
    if (act !== state.lib) clearSheetDirty(act);
    setStatus("Pobrano " + (act.name || "plik.svg") + ".");
  }

  async function saveProjectToDisk() {
    const state = getState();
    if (!state.dir) {
      setStatus("Otwórz projekt (folder), aby zapisać całość.");
      return false;
    }
    if (!(await ensurePerm(state.dir))) {
      setStatus("Brak uprawnień zapisu do folderu projektu.");
      return false;
    }

    let savedSheets = 0;
    let savedLib = false;

    if (state.lib?.svg) {
      try {
        let h = state.lib.handle || state.libHandle;
        if (!h) {
          const libName = state.lib.name || "E-00_symbole.svg";
          h = await state.dir.getFileHandle(libName, { create: true });
          state.lib.handle = h;
          state.libHandle = h;
          idbSet("libHandle", h).catch(() => {});
        }
        if (await ensurePerm(h)) {
          await writeHandle(h, serializeSvg(state.lib.svg));
          flushLibrary();
          savedLib = true;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    for (const sheet of state.sheets || []) {
      if (!sheet.dirty || !sheet.svg) continue;
      try {
        const r = inlineSheetDefs(sheet);
        if (r?.missing?.length) console.warn("Zapis projektu: brak symboli:", r.missing.join(", "));
        let h = sheet.handle;
        if (!h) {
          if (sheet.relPath && getFileHandleByPath) {
            h = await getFileHandleByPath(state.dir, sheet.relPath, true);
          } else if (sheet.name) {
            h = await state.dir.getFileHandle(sheet.name, { create: true });
          }
          if (h) sheet.handle = h;
        }
        if (h && (await ensurePerm(h))) {
          await writeHandle(h, serializeSvg(sheet.svg));
          clearSheetDirty(sheet);
          savedSheets++;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    const settingsOk = saveProjectSettings ? await saveProjectSettings() : false;
    flushDoc();
    if (buildSymbolList) buildSymbolList();
    if (syncListSelection) syncListSelection();

    let msg = "Zapisano projekt";
    const bits = [];
    if (savedLib) bits.push("biblioteka");
    if (savedSheets) bits.push(savedSheets + " schemat" + (savedSheets === 1 ? "" : "ów"));
    if (settingsOk) bits.push("projekt.json");
    if (bits.length) msg += " (" + bits.join(", ") + ")";
    else msg += " (brak zmian do zapisu)";
    if (typeof onDirtyChange === "function") onDirtyChange();
    setStatus(msg, { toast: true, tone: "success" });
    return true;
  }

  async function save() {
    const state = getState();
    if (typeof validateBeforeSave === "function") {
      const v = validateBeforeSave(state);
      if (v?.message) setStatus(v.message, { toast: !!v.bad, tone: v.bad ? "warning" : "info" });
    }
    if (!state.dir) return saveFile();
    await saveFile();
    return saveProjectToDisk();
  }

  return {
    hasPerm,
    ensurePerm,
    writeHandle,
    saveFile,
    save,
    saveAs,
    saveProjectToDisk,
    downloadSvg,
  };
}
