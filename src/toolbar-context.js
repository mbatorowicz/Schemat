/** Widoczność grup toolbara — czysta logika (testowalna regresja UI). */

const STROKE_DRAW = new Set(["line", "rect", "circle", "arc", "lead", "point", "branch"]);
const FILL_DRAW = new Set(["rect", "circle"]);

export function resolveToolbarGroups({
  onLib,
  onSheet,
  symSelected,
  hasSelection,
  hasDir,
  selectionPropsMode = null,
  drawMode = null,
  hasStroke = false,
  hasFill = false,
  hasText = false,
  canPromoteConn = false,
}) {
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
  const onCanvas = onLib || onSheet;
  const dm = drawMode || null;

  let primaryStyleGroup = false;
  let strokeStyleGroup = false;
  let fillStyleGroup = false;
  let textStyleGroup = false;
  if (onCanvas) {
    if (hasSelection) {
      strokeStyleGroup = !!hasStroke;
      fillStyleGroup = !!hasFill;
      textStyleGroup = !!hasText;
    } else if (dm) {
      strokeStyleGroup = STROKE_DRAW.has(dm);
      fillStyleGroup = FILL_DRAW.has(dm);
      textStyleGroup = dm === "text";
    } else {
      strokeStyleGroup = true;
    }
    primaryStyleGroup = strokeStyleGroup || fillStyleGroup || textStyleGroup;
  }

  return {
    drawGroup: onCanvas,
    leadGroup: onCanvas,
    libActionsGroup: onLib,
    libSymbolMetaGroup: onLib && symSelected,
    resourceNameGroup: !!resourceNameMode,
    resourceNameMode,
    selectionPropsGroup: showProps,
    selectionPropsMode: showProps ? propsMode : null,
    netlistGroup: onSheet,
    netlistEditGroup: onSheet && !dm && (propsMode === "wire" || canPromoteConn),
    arrangeGroup: onSheet && hasSelection,
    fileGroup: true,
    editGroup: true,
    createGroup: true,
    viewGroup: true,
    settingsGroup: true,
    primaryStyleGroup,
    strokeStyleGroup,
    fillStyleGroup,
    textStyleGroup,
  };
}
