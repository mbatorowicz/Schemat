/** Widoczność grup toolbara — czysta logika (testowalna regresja UI). */

import { symbolSelectionSummary } from "./ui-wording.js";

export function resolveToolbarGroups({ onLib, onSheet, symSelected, hasSelection, hasDir }) {
  let resourceNameMode = null;
  if (onSheet) resourceNameMode = "sheet";
  else if (onLib) resourceNameMode = "library";
  else if (hasDir) resourceNameMode = "project";

  return {
    drawGroup: onLib || onSheet,
    leadGroup: onLib || onSheet,
    /** Przyciski węzeł/pin są w leadGroup; markGroup zostaje ukryty (placeholder id). */
    markGroup: false,
    libActionsGroup: onLib,
    libSymbolMetaGroup: onLib && symSelected,
    resourceNameGroup: !!resourceNameMode,
    resourceNameMode,
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
