/** Widoczność grup toolbara — czysta logika (testowalna regresja UI). */

import { symbolSelectionSummary } from "./ui-wording.js";

/** Tryb formularza instancji na belce: use | conn | null. */
export function resolveInstanceMetaKind({ onSheet, selection }) {
  if (!onSheet || !selection || selection.length !== 1) return null;
  const el = selection[0];
  if (!el || !el.tagName) return null;
  if (el.getAttribute && el.getAttribute("data-role") === "conn") return "conn";
  if (el.tagName.toLowerCase() === "use") return "use";
  return null;
}

export function resolveToolbarGroups({
  onLib,
  onSheet,
  symSelected,
  hasSelection,
  hasDir,
  instanceMetaKind = null,
}) {
  /** Nazwy schematów/symboli — inline na listach; tu tylko plik biblioteki / folder projektu. */
  let resourceNameMode = null;
  if (onLib) resourceNameMode = "library";
  else if (!onSheet && hasDir) resourceNameMode = "project";

  const meta =
    onSheet && (instanceMetaKind === "use" || instanceMetaKind === "conn")
      ? instanceMetaKind
      : null;

  return {
    drawGroup: onLib || onSheet,
    leadGroup: onLib || onSheet,
    /** Przyciski węzeł/pin są w leadGroup; markGroup zostaje ukryty (placeholder id). */
    markGroup: false,
    libActionsGroup: onLib,
    libSymbolMetaGroup: onLib && symSelected,
    resourceNameGroup: !!resourceNameMode,
    resourceNameMode,
    sheetInstanceMetaGroup: !!meta,
    instanceMetaKind: meta,
    /** Wstawianie symboli tylko z listy po lewej (+), bez selecta na belce. */
    sheetInsertGroup: false,
    netlistGroup: onSheet,
    arrangeGroup: onSheet && hasSelection,
    moreGroup: true,
    createGroup: true,
  };
}

export function formatLibrarySelectionInfo(symId, oznLabel) {
  return symbolSelectionSummary(symId, oznLabel);
}
