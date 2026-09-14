/**
 * Szkic arkusza ze spisu: rozstaw brakujących symboli + trasowanie ortogonalne.
 */
import { catalogFromLibrary, matchSymbolsForRef, symbolChoiceLabel } from "./symbol-from-ref.js";
import { sheetContentBounds, laneRects } from "./sheet-lanes.js";
import { missingRefs, proposePlacements, sortConnectionsForRouting } from "./layout-from-netlist.js";
import { W, status } from "./ui-wording.js";
import { askRouteChoice } from "./ui-dialog.js";
import { num } from "./svg-utils.js";

function sheetHasContent(node) {
  if (!node?.querySelector) return false;
  if (node.querySelector("use[data-ref]")) return true;
  if (node.querySelector("line[data-conn-id], polyline[data-conn-id]")) return true;
  return false;
}

function existingUsePositions(node) {
  if (!node?.querySelectorAll) return [];
  return [...node.querySelectorAll("use[data-ref]")].map((u) => ({
    x: num(u, "x"),
    y: num(u, "y"),
  }));
}

export function createNetlistLayout(ctx) {
  const {
    state,
    currentSymNode,
    insertInstance,
    routeConnectionBatch,
    pushUndo,
    render,
    setStatus,
    askChoice,
    askSelect,
    selectSheet,
    targetSheet,
    ensureInstancePinLabels,
    getOrient,
  } = ctx;

  async function resolveMissingToPlace(missing, catalog) {
    const toPlace = [];
    const unresolved = [];
    for (const ref of missing) {
      const match = matchSymbolsForRef(ref, catalog);
      if (match.status === "unique") {
        toPlace.push({ ref, symbolId: match.matches[0].id });
        continue;
      }
      if (match.status === "ambiguous" && typeof askSelect === "function") {
        const picked = await askSelect(W.dialog.pickSymbolForRef, {
          label: status.layoutPickSymbol(ref),
          options: match.matches.map((m) => ({
            value: m.id,
            label: symbolChoiceLabel(m),
          })),
        });
        if (picked) toPlace.push({ ref, symbolId: picked });
        else unresolved.push(ref);
        continue;
      }
      unresolved.push(ref);
    }
    return { toPlace, unresolved };
  }

  async function generateSketchFromNetlist() {
    const connections = state.netlist?.connections || [];
    if (!connections.length) {
      setStatus(status.layoutNoNetlist, { toast: true, tone: "warning" });
      return null;
    }
    const sheet = typeof targetSheet === "function" ? targetSheet() : null;
    if (!sheet) {
      setStatus(status.layoutNoSheet, { toast: true, tone: "warning" });
      return null;
    }
    if (state.active !== sheet && typeof selectSheet === "function") selectSheet(sheet);
    const node = currentSymNode();
    if (!node) return null;

    let onlyBare = false;
    if (sheetHasContent(node)) {
      const choice = askChoice
        ? await askRouteChoice(askChoice, W.confirm.generateSketch, {
            title: W.dialog.generateSketch,
            cancelLabel: W.choice.cancel,
            localLabel: W.choice.onlyMissing,
            libraryLabel: W.choice.replaceAuto,
          })
        : "library";
      if (choice === "cancel") return null;
      onlyBare = choice === "local";
    }

    const catalog = catalogFromLibrary(state.lib?.svg);
    const missing = missingRefs(connections, node);
    const { toPlace, unresolved } = await resolveMissingToPlace(missing, catalog);

    const orient = typeof getOrient === "function" ? getOrient() : "landscape";
    const step = state.step || 5;
    const bounds = sheetContentBounds(orient);
    const lanes = laneRects(bounds, step);
    const placements = proposePlacements({
      toPlace,
      existingPositions: existingUsePositions(node),
      lanes,
      step,
    });

    pushUndo();
    let placed = 0;
    placements.forEach((p) => {
      const el = insertInstance(p.symbolId, { x: p.x, y: p.y, ref: p.ref, silent: true, skipUndo: true });
      if (el) placed++;
    });
    if (typeof ensureInstancePinLabels === "function") ensureInstancePinLabels(node);
    render();

    const routed =
      typeof routeConnectionBatch === "function"
        ? routeConnectionBatch(sortConnectionsForRouting(connections), {
            skipManual: true,
            onlyBare,
            skipUndo: true,
            skipRender: true,
          })
        : { ok: 0, fail: 0, ortho: 0, straight: 0 };
    render();
    const empty = !placed && !routed.ok;
    setStatus(empty ? status.layoutNothingToPlace : status.layoutSketchDone({ placed, routed, unresolved }), {
      toast: true,
      tone: empty || (routed.fail && !routed.ok && !placed) ? "warning" : "success",
    });
    return { placed, unresolved, routed };
  }

  return { generateSketchFromNetlist, sheetHasContent };
}
