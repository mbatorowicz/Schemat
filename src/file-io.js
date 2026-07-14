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
        const warn = r?.missing?.length ? " (ostrzeżenie: brak symboli " + r.missing.join(", ") + ")" : "";
        setStatus((act === state.lib ? "Zapisano bibliotekę " : "Zapisano schemat ") + act.name + warn);
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

  return {
    hasPerm,
    ensurePerm,
    writeHandle,
    saveFile,
    saveAs,
    downloadSvg,
  };
}

/** Inline defs z zależnościami (używane przez main przy tworzeniu fileIo). */
export function buildInlineSheetDefs(sheet, ctx) {
  return inlineSheetDefsSafe(sheet, ctx);
}
