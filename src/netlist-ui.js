import { NetlistModel } from "./netlist-model.js";
import {
  netlistNamesForSheet,
  pickNetlistForSheet,
  netlistsForSheet,
  walkDir,
  sheetBasename as linkedSheetBasename,
} from "./project-files.js";
import { summarizeNetlistHealth } from "./netlist-validate.js";
import { bindModalA11y } from "./ui-dialog.js";

/**
 * UI i ładowanie spisu połączeń — wydzielone z main.js.
 */
export function createNetlistUi(deps) {
  const {
    getState,
    setStatus,
    connectionDiagnostics,
    collectNetlistProposals,
    saveProject,
    getSettingsCfg,
  } = deps;

  function refreshNetlistUI() {
    const state = getState();
    const sel = document.getElementById("netlistConn");
    const prev = state.selectedConnId;
    sel.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = state.netlist ? "wybierz połączenie" : "spis połączeń";
    sel.appendChild(empty);
    (state.netlist?.connections || []).forEach((r) => {
      const d = connectionDiagnostics(r);
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.id + " · " + r.from.raw + " → " + r.to.raw + " · " + (d.ok ? "OK" : d.reason);
      o.dataset.ok = d.ok ? "1" : "0";
      sel.appendChild(o);
    });
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    else state.selectedConnId = "";
    document.getElementById("btnRouteConn").disabled = !state.netlist || !sel.value;
    const health = document.getElementById("netlistHealth");
    if (health) {
      if (!state.netlist) {
        health.textContent = "";
        health.dataset.bad = "0";
        health.removeAttribute("title");
      } else {
        const h = summarizeNetlistHealth(state.netlist, connectionDiagnostics);
        health.textContent = h.bad ? h.bad + "/" + h.total + " błędów" : h.total ? "OK · " + h.total : "";
        health.dataset.bad = h.bad ? "1" : "0";
        health.title = h.summary;
      }
    }
  }

  function sheetBasename(sheet) {
    return linkedSheetBasename(sheet);
  }

  async function listNetlistFiles(dir) {
    const state = getState();
    if (state.projectNetlists?.length) return state.projectNetlists.slice();
    const out = [];
    if (!dir) return out;
    try {
      const walked = await walkDir(dir, { maxDepth: 6 });
      out.push(
        ...walked.files
          .filter((f) => /^polaczenia.*\.md$/i.test(f.name))
          .map((f) => ({ name: f.name, relPath: f.relPath, handle: f.handle }))
      );
    } catch (e) {
      /* brak dostępu */
    }
    return out;
  }

  async function loadNetlistText(text, name, handle, opts) {
    const state = getState();
    const silent = opts?.silent;
    try {
      state.netlist = NetlistModel.parse(text);
      state.netlist.name = name || "spis.md";
      state.netlistHandle = handle || null;
      state.netlistRaw = text;
      state.selectedConnId = "";
      refreshNetlistUI();
      saveProject();
      if (!silent) setStatus("Wczytano spis: " + state.netlist.connections.length + " połączeń.");
    } catch (e) {
      console.error(e);
      if (!silent) setStatus("Nie udało się odczytać spisu połączeń.");
    }
  }

  async function autoLoadNetlistForSheet(sheet, dir, opts) {
    const state = getState();
    if (!sheet || !dir) return false;
    const silent = opts?.silent;
    const files = await listNetlistFiles(dir);
    if (!files.length) {
      if (!silent) setStatus("Brak plików spisu połączeń w projekcie.");
      return false;
    }
    const pick = pickNetlistForSheet(netlistsForSheet(files, sheet), sheet);
    if (!pick) {
      state.netlist = null;
      state.netlistRaw = null;
      state.netlistHandle = null;
      state.selectedConnId = "";
      refreshNetlistUI();
      saveProject();
      if (!silent) setStatus("Brak spisu połączeń dla arkusza " + sheetBasename(sheet.name) + ".");
      return false;
    }
    if (state.netlist?.name?.toLowerCase() === pick.name.toLowerCase()) return true;
    try {
      const text = await (await pick.handle.getFile()).text();
      await loadNetlistText(text, pick.name, pick.handle, opts);
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  async function pickNetlist() {
    if (window.showOpenFilePicker) {
      try {
        const [h] = await window.showOpenFilePicker({
          types: [
            {
              description: "Spis połączeń Markdown",
              accept: { "text/markdown": [".md"], "text/plain": [".md"] },
            },
          ],
        });
        const f = await h.getFile();
        await loadNetlistText(await f.text(), f.name, h);
        return;
      } catch (e) {
        if (e.name !== "AbortError") console.warn(e);
        return;
      }
    }
    document.getElementById("netlistInput").click();
  }

  let reviewModal = null;

  function openNetlistReview() {
    document.getElementById("netlistReviewText").value = NetlistModel.proposalPreview(collectNetlistProposals());
    if (reviewModal) reviewModal.open();
    else document.getElementById("netlistReview").classList.add("open");
  }

  function wireNetlistDom() {
    reviewModal = bindModalA11y({
      id: "netlistReview",
      labelledBy: "netlistReviewTitle",
      initialFocus: "netlistReviewClose",
    });
    document.getElementById("btnNetlistOpen").onclick = pickNetlist;
    document.getElementById("netlistInput").onchange = (e) => {
      const f = e.target.files[0];
      if (f) f.text().then((t) => loadNetlistText(t, f.name, null));
    };
    document.getElementById("netlistConn").onchange = (e) => {
      const state = getState();
      state.selectedConnId = e.target.value;
      document.getElementById("btnRouteConn").disabled = !state.selectedConnId;
      if (state.selectedConnId) {
        const r = state.netlist.connections.find((x) => x.id === state.selectedConnId);
        const d = connectionDiagnostics(r);
        setStatus(d.ok ? "Połączenie " + r.id + " gotowe do trasowania." : d.reason, {
          toast: !d.ok,
          tone: d.ok ? "info" : "warning",
        });
      }
    };
    document.getElementById("btnExportNetlist").onclick = openNetlistReview;
    document.getElementById("netlistReviewClose").onclick = () => reviewModal.close();
    document.getElementById("netlistReviewDownload").onclick = () => {
      const text = document.getElementById("netlistReviewText").value;
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "propozycje_polaczen.md";
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  function netlistCandidates(sheet) {
    const settingsCfg = getSettingsCfg();
    const names = new Set(netlistNamesForSheet(sheet?.name));
    const setSheet = (settingsCfg.sheet || "").trim();
    if (setSheet) netlistNamesForSheet(setSheet + ".svg").forEach((n) => names.add(n));
    return [...names];
  }

  return {
    refreshNetlistUI,
    loadNetlistText,
    autoLoadNetlistForSheet,
    pickNetlist,
    openNetlistReview,
    wireNetlistDom,
    netlistCandidates,
    sheetBasename,
  };
}
