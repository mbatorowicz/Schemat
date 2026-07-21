/** Widoczność grup toolbara — czysta logika (testowalna regresja UI). */

export function resolveToolbarGroups({ onLib, onSheet, symSelected, hasSelection, hasDir, selectionPropsMode = null }) {
  /** Nazwy schematów/symboli — inline na listach; tu tylko plik biblioteki / folder projektu. */
  let resourceNameMode = null;
  if (onLib) resourceNameMode = "library";
  else if (!onSheet && hasDir) resourceNameMode = "project";

  const propsMode =
    selectionPropsMode === "use" ||
    selectionPropsMode === "conn" ||
    selectionPropsMode === "text" ||
    selectionPropsMode === "wire"
      ? selectionPropsMode
      : null;
  const showProps = onSheet && !!propsMode;

  return {
    drawGroup: onLib || onSheet,
    leadGroup: onLib || onSheet,
    libActionsGroup: onLib,
    libSymbolMetaGroup: onLib && symSelected,
    resourceNameGroup: !!resourceNameMode,
    resourceNameMode,
    selectionPropsGroup: showProps,
    selectionPropsMode: showProps ? propsMode : null,
    netlistGroup: onSheet,
    arrangeGroup: onSheet && hasSelection,
    fileGroup: true,
    createGroup: true,
    viewGroup: true,
    settingsGroup: true,
  };
}
