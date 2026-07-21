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
import {
  ensureNetlistForSheet,
  hasStoredConnections,
  adoptConnectionsToSheet,
  syncNetlistToProject,
  upsertConnection,
  removeConnectionById,
  allocateConnectionId,
} from "./sheet-connections.js";
import { isWireGeometry, wireConnId } from "./wire-geometry.js";
import { highlightWireByConnId, clearWireConnHighlight } from "./wire-highlight.js";
import { qsById } from "./dom-selectors.js";

/**
 * Odświeżanie health/UI spisu z debounce (po render / zmianie arkusza).
 * @param {{ refreshNetlistUI: () => void, debounceMs?: number }} opts
 */
export function createNetlistLiveValidator({ refreshNetlistUI, debounceMs = 180 }) {
  let timer = null;
  function scheduleRefresh() {
    if (typeof refreshNetlistUI !== "function") return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      refreshNetlistUI();
    }, debounceMs);
  }
  return { scheduleRefresh };
}

/**
 * UI i ładowanie spisu połączeń — SSOT w projekt.json.
 */
export function createNetlistUi(deps) {
  const {
    getState,
    setStatus,
    connectionDiagnostics,
    collectNetlistProposals,
    saveProject,
    getSettingsCfg,
    saveProjectSettings,
    getTargetSheet,
    sheetWireHealth,
    promoteSelectionToConnection,
    currentSymNode,
    selectSheetElement,
    applyConnectionRecord,
  } = deps;

  let editorModal = null;
  let reviewModal = null;
  let editorSelectedId = "";

  function targetSheet() {
    if (typeof getTargetSheet === "function") return getTargetSheet();
    const state = getState();
    return state.lastSheet && state.sheets.includes(state.lastSheet) ? state.lastSheet : state.sheets[0] || null;
  }

  function persistNow() {
    const state = getState();
    const sheet = targetSheet();
    const settingsCfg = getSettingsCfg();
    if (sheet && settingsCfg) syncNetlistToProject(state, sheet, settingsCfg);
    saveProject();
    if (typeof saveProjectSettings === "function") saveProjectSettings();
  }

  function syncHighlight() {
    const state = getState();
    const sheet = targetSheet();
    const node = sheet ? qsById(sheet.svg, sheet.id) : null;
    if (!node) return;
    clearWireConnHighlight(node);
    if (state.selectedConnId) highlightWireByConnId(node, state.selectedConnId);
  }

  function refreshNetlistUI() {
    const state = getState();
    const sel = document.getElementById("netlistConn");
    if (!sel) return;
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
      o.textContent = NetlistModel.connectionListLabel(r, d.ok ? "OK" : d.reason);
      o.dataset.ok = d.ok ? "1" : "0";
      sel.appendChild(o);
    });
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    else state.selectedConnId = "";
    const routeBtn = document.getElementById("btnRouteConn");
    if (routeBtn) routeBtn.disabled = !state.netlist || !sel.value;
    const routeAllBtn = document.getElementById("btnRouteAllConn");
    if (routeAllBtn) routeAllBtn.disabled = !state.netlist || !(state.netlist.connections || []).length;
    const promoteBtn = document.getElementById("btnPromoteConn");
    const breakBtn = document.getElementById("btnBreakPoint");
    const wireEl = state.activeEl || state.selection?.[0];
    const wireOk = isWireGeometry(wireEl);
    if (promoteBtn) promoteBtn.disabled = !wireOk;
    if (breakBtn) {
      const onSheet = !!(state.active && state.sheets?.includes?.(state.active));
      breakBtn.disabled = !onSheet;
      breakBtn.classList.toggle("primary", !!state.breakEditMode);
    }
    const health = document.getElementById("netlistHealth");
    if (health) {
      if (!state.netlist) {
        health.textContent = "";
        health.dataset.bad = "0";
        health.removeAttribute("title");
      } else {
        const h = summarizeNetlistHealth(state.netlist, connectionDiagnostics);
        let geoNote = "";
        if (typeof sheetWireHealth === "function") {
          const geo = sheetWireHealth(targetSheet());
          const nOrphan = geo.orphans?.length || 0;
          const nBare = geo.bare?.length || 0;
          if (nOrphan || nBare) {
            geoNote =
              (nOrphan ? nOrphan + " orphan" : "") +
              (nOrphan && nBare ? ", " : "") +
              (nBare ? nBare + " do promocji" : "");
          }
        }
        const label = h.bad ? h.bad + "/" + h.total + " błędów" : h.total ? "OK · " + h.total : "";
        health.textContent = geoNote ? (label ? label + " · " : "") + geoNote : label;
        health.dataset.bad = h.bad || geoNote ? "1" : "0";
        health.title = [h.summary, geoNote].filter(Boolean).join(" ");
      }
    }
    syncHighlight();
    if (document.getElementById("netlistEditor")?.classList.contains("open")) fillEditorTable();
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

  /** Migracja legacy md → SSOT (jednorazowo gdy brak wpisu w projekcie). */
  async function migrateMdIfNeeded(sheet, dir, opts) {
    const settingsCfg = getSettingsCfg();
    if (!sheet || !dir || !settingsCfg) return false;
    if (hasStoredConnections(settingsCfg, sheet)) return false;
    const silent = opts?.silent;
    const files = await listNetlistFiles(dir);
    const pick = pickNetlistForSheet(netlistsForSheet(files, sheet), sheet);
    if (!pick) return false;
    try {
      const text = await (await pick.handle.getFile()).text();
      const parsed = NetlistModel.parse(text);
      adoptConnectionsToSheet(getState(), sheet, settingsCfg, parsed.connections);
      if (typeof saveProjectSettings === "function") await saveProjectSettings();
      saveProject();
      if (!silent) setStatus("Zmigrowano spis z " + pick.name + " → projekt.json (" + parsed.connections.length + ").");
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  async function loadNetlistText(text, name, handle, opts) {
    const state = getState();
    const silent = opts?.silent;
    const sheet = targetSheet();
    const settingsCfg = getSettingsCfg();
    try {
      const parsed = NetlistModel.parse(text);
      if (sheet && settingsCfg) {
        adoptConnectionsToSheet(state, sheet, settingsCfg, parsed.connections);
        if (typeof saveProjectSettings === "function") await saveProjectSettings();
      } else {
        state.netlist = parsed;
        state.netlist.name = name || "spis.md";
        state.netlist.source = "markdown";
      }
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
    const settingsCfg = getSettingsCfg();
    if (!sheet) return false;
    const silent = opts?.silent;

    if (settingsCfg && hasStoredConnections(settingsCfg, sheet)) {
      ensureNetlistForSheet(state, sheet, settingsCfg);
      state.selectedConnId = "";
      refreshNetlistUI();
      saveProject();
      return true;
    }

    if (dir) {
      const migrated = await migrateMdIfNeeded(sheet, dir, opts);
      if (migrated) {
        refreshNetlistUI();
        return true;
      }
    }

    ensureNetlistForSheet(state, sheet, settingsCfg || {});
    state.selectedConnId = "";
    refreshNetlistUI();
    saveProject();
    if (!silent && !state.netlist.connections.length) {
      setStatus("Brak połączeń dla arkusza " + sheetBasename(sheet) + " — dodaj w edytorze spisu.");
    }
    return !!state.netlist;
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
    document.getElementById("netlistInput")?.click();
  }

  function fillEditorForm(record) {
    const g = (id) => document.getElementById(id);
    if (!record) {
      g("neId").value = "";
      g("neFrom").value = "";
      g("neTo").value = "";
      g("neNet").value = "—";
      g("neWire").value = "do ustalenia";
      if (g("neLength")) g("neLength").value = "";
      g("neNotes").value = "";
      return;
    }
    const n = NetlistModel.normalizeConnection(record);
    g("neId").value = n.id || "";
    g("neFrom").value = n.from?.raw || "";
    g("neTo").value = n.to?.raw || "";
    g("neNet").value = n.net || "—";
    g("neWire").value = n.wire || "do ustalenia";
    if (g("neLength")) g("neLength").value = n.length || "";
    g("neNotes").value = n.notes || "";
  }

  function readEditorForm() {
    const g = (id) => document.getElementById(id);
    return NetlistModel.normalizeConnection({
      id: g("neId").value.trim(),
      from: g("neFrom").value.trim(),
      to: g("neTo").value.trim(),
      net: g("neNet").value.trim(),
      wire: g("neWire").value.trim(),
      length: g("neLength")?.value.trim() || "",
      notes: g("neNotes").value.trim(),
      section: 1,
    });
  }

  function patchWireFromRecord(rec) {
    if (typeof applyConnectionRecord !== "function" || !rec?.id) return;
    const node = currentSymNode?.();
    applyConnectionRecord(rec, {
      sheetNode: node,
      persist: false,
      upsert: false,
      routeKind: undefined,
    });
  }

  function fillEditorTable() {
    const state = getState();
    const tbody = document.getElementById("netlistEditorBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    (state.netlist?.connections || []).forEach((r) => {
      const d = connectionDiagnostics(r);
      const n = NetlistModel.normalizeConnection(r);
      const tr = document.createElement("tr");
      tr.dataset.id = r.id;
      if (r.id === editorSelectedId) tr.classList.add("selected");
      tr.innerHTML =
        "<td>" +
        n.id +
        "</td><td>" +
        (n.from?.raw || "") +
        "</td><td>" +
        (n.to?.raw || "") +
        "</td><td>" +
        (n.net || "") +
        "</td><td>" +
        (n.wire || "") +
        "</td><td>" +
        (n.length || "") +
        "</td><td>" +
        (d.ok ? "OK" : d.reason) +
        "</td>";
      tr.onclick = () => {
        editorSelectedId = r.id;
        const st = getState();
        st.selectedConnId = r.id;
        fillEditorForm(r);
        fillEditorTable();
        const sel = document.getElementById("netlistConn");
        if (sel) sel.value = r.id;
        refreshNetlistUI();
        const node = currentSymNode?.();
        const wire = node && highlightWireByConnId(node, r.id);
        if (wire && typeof selectSheetElement === "function") selectSheetElement(wire, { noScroll: true });
      };
      tbody.appendChild(tr);
    });
  }

  function openNetlistEditor() {
    const state = getState();
    const sheet = targetSheet();
    const settingsCfg = getSettingsCfg();
    if (sheet && settingsCfg) ensureNetlistForSheet(state, sheet, settingsCfg);
    else if (!state.netlist) {
      state.netlist = { meta: {}, connections: [], name: "projekt", source: "project" };
    }
    editorSelectedId = state.selectedConnId || "";
    const rec = state.netlist.connections.find((c) => c.id === editorSelectedId);
    fillEditorForm(rec || null);
    fillEditorTable();
    if (editorModal) editorModal.open();
    else document.getElementById("netlistEditor")?.classList.add("open");
  }

  function openNetlistReview() {
    document.getElementById("netlistReviewText").value = NetlistModel.proposalPreview(collectNetlistProposals());
    if (reviewModal) reviewModal.open();
    else document.getElementById("netlistReview").classList.add("open");
  }

  async function promptPromoteFields(draft) {
    return new Promise((resolve) => {
      const bg = document.getElementById("promoteConn");
      if (!bg) {
        resolve(draft);
        return;
      }
      const g = (id) => document.getElementById(id);
      const dn = NetlistModel.normalizeConnection(draft);
      g("pcId").value = dn.id;
      g("pcFrom").value = dn.from?.raw || "";
      g("pcTo").value = dn.to?.raw || "";
      g("pcNet").value = dn.net || "—";
      g("pcWire").value = dn.wire || "do ustalenia";
      if (g("pcLength")) g("pcLength").value = dn.length || "";
      g("pcNotes").value = dn.notes || "";
      const finish = (ok) => {
        bg.classList.remove("open");
        g("pcOk").onclick = null;
        g("pcCancel").onclick = null;
        if (!ok) {
          resolve(null);
          return;
        }
        resolve(
          NetlistModel.normalizeConnection({
            id: g("pcId").value.trim() || draft.id,
            from: g("pcFrom").value.trim(),
            to: g("pcTo").value.trim(),
            net: g("pcNet").value.trim(),
            wire: g("pcWire").value.trim(),
            length: g("pcLength")?.value.trim() || "",
            notes: g("pcNotes").value.trim(),
          })
        );
      };
      g("pcOk").onclick = () => finish(true);
      g("pcCancel").onclick = () => finish(false);
      bg.classList.add("open");
      g("pcId").focus();
    });
  }

  async function onPromote() {
    if (typeof promoteSelectionToConnection !== "function") return;
    await promoteSelectionToConnection({ editRecord: promptPromoteFields });
    refreshNetlistUI();
  }

  function wireNetlistDom() {
    reviewModal = bindModalA11y({
      id: "netlistReview",
      labelledBy: "netlistReviewTitle",
      initialFocus: "netlistReviewClose",
    });
    editorModal = bindModalA11y({
      id: "netlistEditor",
      labelledBy: "netlistEditorTitle",
      initialFocus: "netlistEditorClose",
    });
    bindModalA11y({
      id: "promoteConn",
      labelledBy: "promoteConnTitle",
      initialFocus: "pcId",
    });

    document.getElementById("btnNetlistOpen").onclick = openNetlistEditor;
    document.getElementById("btnNetlistImport")?.addEventListener("click", pickNetlist);
    document.getElementById("netlistInput")?.addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (f) f.text().then((t) => loadNetlistText(t, f.name, null));
    });
    document.getElementById("netlistConn").onchange = (e) => {
      const state = getState();
      state.selectedConnId = e.target.value;
      document.getElementById("btnRouteConn").disabled = !state.selectedConnId;
      const routeAllBtn = document.getElementById("btnRouteAllConn");
      if (routeAllBtn) routeAllBtn.disabled = !state.netlist || !(state.netlist.connections || []).length;
      syncHighlight();
      if (state.selectedConnId) {
        const r = state.netlist.connections.find((x) => x.id === state.selectedConnId);
        const d = connectionDiagnostics(r);
        setStatus(
          d.ok
            ? "Połączenie " + r.id + " (niebieskie podświetlenie ze spisu · Esc / klik pustego = odznacz)."
            : d.reason,
          {
            toast: !d.ok,
            tone: d.ok ? "info" : "warning",
          }
        );
        const node = currentSymNode?.();
        const wire = node && highlightWireByConnId(node, state.selectedConnId);
        if (wire && typeof selectSheetElement === "function") selectSheetElement(wire, { noScroll: true });
      } else {
        const node = currentSymNode?.();
        if (node) clearWireConnHighlight(node);
      }
    };
    document.getElementById("btnExportNetlist").onclick = openNetlistReview;
    document.getElementById("btnPromoteConn")?.addEventListener("click", () => onPromote());
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

    document.getElementById("netlistEditorClose")?.addEventListener("click", () => {
      persistNow();
      editorModal.close();
      refreshNetlistUI();
    });
    document.getElementById("neAdd")?.addEventListener("click", () => {
      const state = getState();
      const id = allocateConnectionId(state.netlist?.connections || []);
      const rec = NetlistModel.normalizeConnection({
        id,
        from: "",
        to: "",
        signal: "",
        net: "—",
        wire: "do ustalenia",
        notes: "",
      });
      state.netlist.connections = upsertConnection(state.netlist.connections || [], rec);
      editorSelectedId = id;
      state.selectedConnId = id;
      fillEditorForm(rec);
      fillEditorTable();
      persistNow();
      refreshNetlistUI();
    });
    document.getElementById("neSaveRow")?.addEventListener("click", () => {
      const state = getState();
      const rec = readEditorForm();
      if (!rec.id) {
        setStatus("Podaj numer połączenia.", { toast: true, tone: "warning" });
        return;
      }
      const prev = editorSelectedId;
      let list = state.netlist.connections || [];
      if (prev && prev !== rec.id) list = removeConnectionById(list, prev);
      state.netlist.connections = upsertConnection(list, rec);
      editorSelectedId = rec.id;
      state.selectedConnId = rec.id;
      patchWireFromRecord(rec);
      fillEditorTable();
      persistNow();
      refreshNetlistUI();
      setStatus("Zapisano połączenie " + rec.id + ".", { toast: true, tone: "success" });
    });
    document.getElementById("neDelete")?.addEventListener("click", () => {
      const state = getState();
      const id = editorSelectedId || readEditorForm().id;
      if (!id) return;
      state.netlist.connections = removeConnectionById(state.netlist.connections, id);
      editorSelectedId = "";
      state.selectedConnId = "";
      fillEditorForm(null);
      fillEditorTable();
      persistNow();
      refreshNetlistUI();
    });
    document.getElementById("neExportMd")?.addEventListener("click", () => {
      const state = getState();
      const text = NetlistModel.serialize(state.netlist);
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "polaczenia_export.md";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function netlistCandidates(sheet) {
    const settingsCfg = getSettingsCfg();
    const names = new Set(netlistNamesForSheet(sheet?.name));
    const setSheet = (settingsCfg.sheet || "").trim();
    if (setSheet) netlistNamesForSheet(setSheet + ".svg").forEach((n) => names.add(n));
    return [...names];
  }

  /** Dwukierunkowy link: klik w trasę → wybór w spisie. */
  function selectConnectionFromElement(el) {
    const cid = wireConnId(el);
    if (!cid || /^NEW/i.test(cid)) return false;
    const state = getState();
    if (!state.netlist?.connections?.some((c) => c.id === cid)) return false;
    state.selectedConnId = cid;
    const sel = document.getElementById("netlistConn");
    if (sel) sel.value = cid;
    refreshNetlistUI();
    return true;
  }

  return {
    refreshNetlistUI,
    loadNetlistText,
    autoLoadNetlistForSheet,
    pickNetlist,
    openNetlistReview,
    openNetlistEditor,
    wireNetlistDom,
    netlistCandidates,
    sheetBasename,
    promptPromoteFields,
    selectConnectionFromElement,
    persistNow,
  };
}
