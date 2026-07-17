/**
 * Listy sidebara (symbole, arkusze, elementy) — wydzielone z main.js.
 */
import { syncSidebarEmptyStates } from "./sidebar-empty.js";
import { W } from "./ui-wording.js";
import {
  sheetElementKind,
  kindDisplay,
  sheetElementListLabel,
  sheetElementPropertySections,
  schematicSheetChildren,
} from "./sheet-elements.js";
import {
  symbolDisplayName,
  symbolCatalogLabel,
  symbolCatalogSubtitle,
  symbolDesignation,
} from "./symbol-save.js";
import {
  sheetCatalogLabel,
  sheetCatalogSubtitle,
} from "./sheet-catalog.js";
import { libSymbolGroups } from "./symbol-resolver.js";
import { sheetBasename as linkedSheetBasename } from "./project-files.js";
import { SVGNS, XLINK } from "./svg-constants.js";
import { fmt } from "./svg-utils.js";

export { syncSidebarEmptyStates } from "./sidebar-empty.js";
export { emptyListCopy } from "./ui-wording.js";

/**
 * @param {object} deps
 */
export function createSidebarLists(deps) {
  const {
    state,
    symlist,
    schlist,
    elemList,
    elemSec,
    elemProps,
    elemPropsTitle,
    elemPropsBody,
    schEmpty,
    symEmpty,
    elemEmpty,
    isSheetActive,
    currentSymNode,
    selEls,
    selectSheet,
    selectSymbol,
    selectSheetElement,
    insertUse,
    setInstanceRef,
    setStatus,
    render,
    saveProject,
  } = deps;

  const listCollator = new Intl.Collator("pl", { numeric: true, sensitivity: "base" });
  const listCollatorStrict = new Intl.Collator("pl", { numeric: true, sensitivity: "variant" });
  let sidebarBuildSeq = 0;
  let sidebarPrefix = "sidebar-";

  function compareListText(a, b) {
    return listCollator.compare(a, b) || listCollatorStrict.compare(a, b);
  }

  function renderElementProps(el) {
    if (!elemProps || !elemPropsBody) return;
    if (!el) {
      elemProps.classList.add("context-hidden");
      elemPropsBody.innerHTML = "";
      return;
    }
    const node = currentSymNode();
    if (!node || el.parentNode !== node) {
      renderElementProps(null);
      return;
    }
    const idx = Array.prototype.indexOf.call(node.children, el);
    const sections = sheetElementPropertySections(el, idx);
    if (elemPropsTitle) elemPropsTitle.textContent = sheetElementListLabel(el, idx);
    elemPropsBody.innerHTML = "";
    const kind = sheetElementKind(el);
    sections.forEach((sec) => {
      const s = document.createElement("section");
      const h = document.createElement("h4");
      h.textContent = sec.title;
      s.appendChild(h);
      const dl = document.createElement("dl");
      sec.rows.forEach(([k, v]) => {
        const dt = document.createElement("dt");
        dt.textContent = k;
        const dd = document.createElement("dd");
        if (sec.title === "Oznaczenia (spis połączeń)" && k === "Oznaczenie" && kind === "use") {
          const inp = document.createElement("input");
          inp.type = "text";
          inp.value = (el.getAttribute("data-ref") || "").trim();
          inp.style.width = "100%";
          inp.style.font = "11px Arial";
          inp.title = "Oznaczenie instancji na schemacie (data-ref)";
          inp.addEventListener("change", () => {
            const res = setInstanceRef(el, inp.value);
            if (!res.ok) {
              setStatus(res.reason || "Nie udało się zmienić oznaczenia.");
              inp.value = el.getAttribute("data-ref") || "";
              return;
            }
            if (res.changed) {
              render();
              buildElementList();
              syncElementListSelection();
              setStatus("Oznaczenie: " + inp.value);
              saveProject();
            }
          });
          dd.appendChild(inp);
        } else {
          dd.textContent = v == null || v === "" ? "—" : String(v);
          dd.title = dd.textContent;
        }
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      s.appendChild(dl);
      elemPropsBody.appendChild(s);
    });
    elemProps.classList.remove("context-hidden");
  }

  function syncElementListSelection() {
    if (!elemList) return;
    const node = currentSymNode();
    const sel = selEls().filter((el) => node && el.parentNode === node);
    [...elemList.children].forEach((li) => {
      const on = sel.indexOf(li._elem) >= 0;
      li.classList.toggle("sel", on);
      if (on && li._elem === state.activeEl) li._elem._elemListItem = li;
    });
    if (!isSheetActive()) {
      renderElementProps(null);
      return;
    }
    if (sel.length === 1) renderElementProps(sel[0]);
    else if (sel.length > 1 && elemProps && elemPropsBody) {
      if (elemPropsTitle) elemPropsTitle.textContent = sel.length + " elementów zaznaczonych";
      elemPropsBody.innerHTML =
        '<p class="elem-props-empty">Kliknij jeden element na liście, aby zobaczyć pełne właściwości.</p>';
      elemProps.classList.remove("context-hidden");
    } else renderElementProps(null);
  }

  function buildElementList() {
    if (!elemList || !elemSec || !elemProps) return;
    elemList.innerHTML = "";
    if (!isSheetActive()) {
      elemSec.classList.add("context-hidden");
      elemProps.classList.add("context-hidden");
      elemPropsBody.innerHTML = "";
      syncSidebarEmptyStates({
        schEmpty,
        symEmpty,
        elemEmpty,
        sheetCount: state.sheets.length,
        symbolCount: state.symbols.length,
        elementCount: 0,
        sheetActive: false,
      });
      return;
    }
    const node = currentSymNode();
    if (!node) {
      elemSec.classList.add("context-hidden");
      return;
    }
    elemSec.classList.remove("context-hidden");
    const children = schematicSheetChildren(node);
    children.forEach((el, i) => {
      const li = document.createElement("li");
      const kind = sheetElementKind(el);
      const main = document.createElement("span");
      main.textContent = sheetElementListLabel(el, i);
      const sub = document.createElement("span");
      sub.className = "elem-kind";
      sub.textContent = kindDisplay(kind);
      li.append(main, sub);
      li._elem = el;
      el._elemListItem = li;
      li.onclick = () => selectSheetElement(el);
      elemList.appendChild(li);
    });
    syncSidebarEmptyStates({
      schEmpty,
      symEmpty,
      elemEmpty,
      sheetCount: state.sheets.length,
      symbolCount: state.symbols.length,
      elementCount: children.length,
      sheetActive: true,
    });
    syncElementListSelection();
  }

  function sheetListItem(sh) {
    const li = document.createElement("li");
    li.dataset.id = sh.id;
    const labels = document.createElement("span");
    labels.className = "sch-labels";
    const titleEl = document.createElement("span");
    titleEl.className = "sch-title";
    titleEl.textContent = sheetCatalogLabel(sh);
    const subEl = document.createElement("span");
    subEl.className = "sch-file";
    subEl.textContent = sheetCatalogSubtitle(sh);
    labels.append(titleEl, subEl);
    li.appendChild(labels);
    li.title = [sh.relPath || sh.name, subEl.textContent ? W.list.sheetFileHint(linkedSheetBasename(sh.name)) : ""]
      .filter(Boolean)
      .join(" ");
    li.onclick = () => selectSheet(sh);
    li._sheet = sh;
    li.classList.toggle("sel", state.active === sh);
    return li;
  }

  function syncListSelection() {
    [...symlist.children].forEach((li) =>
      li.classList.toggle("sel", state.active === state.lib && li.dataset.id === state.selId)
    );
    [...schlist.children].forEach((li) => li.classList.toggle("sel", li._sheet === state.active));
  }

  function buildSidebarSymbolDefs() {
    const host = document.querySelector("#sidebarSymbolDefs defs");
    if (!host) return;
    host.innerHTML = "";
    const prefix = "sidebar-" + ++sidebarBuildSeq + "-";
    sidebarPrefix = prefix;
    const ids = state.symbols.flatMap((s) => [s.node, ...s.node.querySelectorAll("[id]")].map((n) => n.id).filter(Boolean));
    const rewrite = (v) => {
      let out = (v || "").replace(/url\(#([^)]+)\)/g, (all, id) => "url(#" + prefix + id + ")");
      ids.forEach((id) => {
        out = out.replace(new RegExp("#" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), "#" + prefix + id);
      });
      return out;
    };
    const style = state.lib && state.lib.svg && state.lib.svg.querySelector("defs style");
    if (style) {
      const st = document.importNode(style, true);
      st.textContent = rewrite(st.textContent);
      host.appendChild(st);
    }
    state.symbols.forEach((sym) => {
      const clone = document.importNode(sym.node, true);
      [clone, ...clone.querySelectorAll("[id]")].forEach((n) => {
        if (n.id) n.id = prefix + n.id;
      });
      [clone, ...clone.querySelectorAll("*")].forEach((n) => {
        const href = n.getAttribute && n.getAttribute("href");
        if (href && href[0] === "#") n.setAttribute("href", "#" + prefix + href.slice(1));
        const xhref = n.getAttributeNS && n.getAttributeNS(XLINK, "href");
        if (xhref && xhref[0] === "#") n.setAttributeNS(XLINK, "xlink:href", "#" + prefix + xhref.slice(1));
        if (n.attributes)
          [...n.attributes].forEach((a) => {
            if (a.value && a.value.indexOf("url(#") >= 0) n.setAttributeNS(a.namespaceURI, a.name, rewrite(a.value));
          });
      });
      host.appendChild(clone);
    });
  }

  function symbolListItem(sym) {
    const li = document.createElement("li");
    li.dataset.id = sym.id;
    li.title = W.list.editSymbol;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "sym-thumb");
    svg.setAttribute("viewBox", "-30 -30 60 60");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const use = document.createElementNS(SVGNS, "use");
    use.setAttribute("href", "#" + sidebarPrefix + sym.id);
    use.setAttributeNS(XLINK, "xlink:href", "#" + sidebarPrefix + sym.id);
    svg.appendChild(use);
    const labels = document.createElement("span");
    labels.className = "sym-labels";
    const idEl = document.createElement("span");
    idEl.className = "sym-id";
    idEl.textContent = symbolCatalogLabel(sym.node, sym.id);
    const oznEl = document.createElement("span");
    oznEl.className = "sym-ozn";
    oznEl.textContent = symbolCatalogSubtitle(sym.node, sym.id);
    labels.append(idEl, oznEl);
    const add = document.createElement("button");
    add.type = "button";
    add.className = "sym-add";
    add.textContent = "+";
    add.title = W.list.insertSymbol(symbolDesignation(sym.node, sym.id));
    add.addEventListener("pointerdown", (e) => e.stopPropagation());
    add.addEventListener("click", (e) => {
      e.stopPropagation();
      insertUse(sym.id, true);
    });
    li.append(svg, labels, add);
    li.onclick = () => selectSymbol(sym.id);
    li.classList.toggle("sel", state.active === state.lib && state.selId === sym.id);
    requestAnimationFrame(() => {
      try {
        const b = use.getBBox();
        const pad = Math.max(2, Math.max(b.width, b.height) * 0.08);
        if (isFinite(b.width) && isFinite(b.height) && (b.width || b.height))
          svg.setAttribute(
            "viewBox",
            [b.x - pad, b.y - pad, Math.max(1, b.width + 2 * pad), Math.max(1, b.height + 2 * pad)].map(fmt).join(" ")
          );
      } catch (e) {
        /* thumb bbox */
      }
    });
    return li;
  }

  function validateSymbolConnections() {
    const issues = [];
    const byId = new Map(state.symbols.map((s) => [s.id, s.node]));
    state.symbols.forEach((sym) => {
      const pins = new Set();
      [...sym.node.querySelectorAll('[data-role="conn"]')].forEach((c) => {
        const pin = (c.getAttribute("data-pin") || "").trim();
        const dir = c.getAttribute("data-dir");
        const kind = (c.getAttribute("data-kind") || "").toLowerCase();
        if (!pin) issues.push(sym.id + ": brak data-pin");
        else if (pins.has(pin)) issues.push(sym.id + ": duplikat pinu " + pin);
        else pins.add(pin);
        if (kind === "lead" && !["N", "E", "S", "W"].includes(dir)) issues.push(sym.id + ":" + pin + " niepoprawny data-dir");
        ["stub", "joint", "label"].forEach((part) => {
          if (!c.querySelector('[data-part="' + part + '"]')) issues.push(sym.id + ":" + pin + " brak " + part);
        });
      });
    });
    function walk(id, stack) {
      if (stack.has(id)) return true;
      const node = byId.get(id);
      if (!node) return false;
      const next = new Set(stack);
      next.add(id);
      return [...node.querySelectorAll("use")].some((u) => {
        const child = (u.getAttribute("href") || u.getAttributeNS(XLINK, "href") || "").replace(/^#/, "");
        return child && walk(child, next);
      });
    }
    state.symbols.forEach((s) => {
      if (walk(s.id, new Set())) issues.push(s.id + ": cykliczne zagnieżdżenie");
    });
    state.connIssues = issues;
    if (issues.length) console.warn("Walidacja przyłączy:", issues);
    return issues;
  }

  function buildSymbolList() {
    state.symbols = [];
    symlist.innerHTML = "";
    schlist.innerHTML = "";
    if (state.lib && state.lib.svg) {
      const seen = new Set();
      libSymbolGroups(state.lib.svg).forEach((g) => {
        if (seen.has(g.id)) return;
        seen.add(g.id);
        state.symbols.push({ id: g.id, node: g });
      });
    }
    state.symbols.sort((a, b) => compareListText(symbolCatalogLabel(a.node, a.id), symbolCatalogLabel(b.node, b.id)));
    buildSidebarSymbolDefs();
    validateSymbolConnections();
    state.symbols.forEach((sym) => symlist.appendChild(symbolListItem(sym)));
    state.sheets.sort((a, b) => compareListText(sheetCatalogLabel(a), sheetCatalogLabel(b)));
    state.sheets.forEach((sh) => schlist.appendChild(sheetListItem(sh)));
    syncListSelection();
    syncSidebarEmptyStates({
      schEmpty,
      symEmpty,
      elemEmpty,
      sheetCount: state.sheets.length,
      symbolCount: state.symbols.length,
      elementCount: isSheetActive() && currentSymNode() ? schematicSheetChildren(currentSymNode()).length : 0,
      sheetActive: isSheetActive(),
    });
    const ins = document.getElementById("insertSym");
    if (ins) {
      const prev = ins.value;
      ins.innerHTML = "";
      state.symbols.forEach((s) => {
        const o = document.createElement("option");
        o.value = s.id;
        const label = symbolCatalogLabel(s.node, s.id);
        const ozn = symbolDesignation(s.node, s.id);
        o.textContent = symbolDisplayName(s.node) && ozn !== label ? label + " · " + ozn : label;
        ins.appendChild(o);
      });
      if ([...ins.options].some((o) => o.value === prev)) ins.value = prev;
    }
  }

  return {
    buildSymbolList,
    buildElementList,
    syncListSelection,
    syncElementListSelection,
    validateSymbolConnections,
    renderElementProps,
    compareListText,
  };
}
