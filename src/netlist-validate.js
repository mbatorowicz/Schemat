/**
 * Podsumowanie spójności netlista ↔ schemat (przy Trasuj / Zapisz).
 */

/**
 * @param {{ connections?: Array<{ id: string }> }} netlist
 * @param {(record: object) => { ok: boolean, reason?: string }} connectionDiagnostics
 * @returns {{ total: number, ok: number, bad: number, issues: Array<{ id: string, reason: string }>, summary: string }}
 */
export function summarizeNetlistHealth(netlist, connectionDiagnostics) {
  const connections = netlist?.connections || [];
  const issues = [];
  let ok = 0;
  for (const r of connections) {
    const d = connectionDiagnostics(r);
    if (d.ok) ok++;
    else issues.push({ id: r.id, reason: d.reason || "błąd" });
  }
  const total = connections.length;
  const bad = issues.length;
  let summary = "";
  if (!total) summary = "Brak połączeń w spisie.";
  else if (!bad) summary = "Spis spójny ze schematem (" + total + ").";
  else
    summary =
      "Spis: " +
      bad +
      "/" +
      total +
      " niespójne" +
      (issues[0] ? " — np. " + issues[0].id + ": " + issues[0].reason : ".");
  return { total, ok, bad, issues, summary };
}

/**
 * Czy przed trasowaniem warto ostrzec (wybrane połączenie niespójne).
 */
export function routeBlockReason(record, connectionDiagnostics) {
  if (!record) return "Nie wybrano połączenia.";
  const d = connectionDiagnostics(record);
  if (d.ok) return "";
  return d.reason || "Nie można rozwiązać końców połączenia.";
}
