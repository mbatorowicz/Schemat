#!/usr/bin/env node
/**
 * Eksport połączeń z projekt.json (SSOT) do markdown dla pipeline DTR.
 *
 * Użycie:
 *   node scripts/export-connections-for-dtr.mjs path/do/projekt.json [outDir]
 *
 * Zapisuje polaczenia_<arkusz>.md obok / w outDir — format kompatybilny ze starym parserem.
 */
import fs from "node:fs";
import path from "node:path";

function clean(v) {
  return String(v || "").trim();
}

function markdownRow(r) {
  return (
    "| " +
    clean(r.id) +
    " | " +
    clean(r.from) +
    " | " +
    clean(r.to) +
    " | " +
    clean(r.signal) +
    " | `" +
    clean(r.net || "—") +
    "` | " +
    clean(r.wire || "do ustalenia") +
    " | " +
    clean(r.notes) +
    " |"
  );
}

function serializeSheet(sheetKey, connections, meta) {
  const base = path.basename(sheetKey, path.extname(sheetKey));
  return [
    "# Spis połączeń",
    "",
    `| **Wersja** | ${base} · ${meta.version || "1.0"} · ${meta.date || ""} |`,
    "",
    "## 1. Połączenia",
    "",
    "| Nr | Od | Do | Sygnał | Oznacznik | Przewód | Uwagi |",
    "|----|----|----|--------|-----------|---------|-------|",
    ...connections.map(markdownRow),
    "",
  ].join("\n");
}

function main() {
  const projPath = process.argv[2];
  if (!projPath) {
    console.error("Użycie: node scripts/export-connections-for-dtr.mjs <projekt.json> [outDir]");
    process.exit(1);
  }
  const outDir = process.argv[3] || path.dirname(path.resolve(projPath));
  const cfg = JSON.parse(fs.readFileSync(projPath, "utf8"));
  const map = cfg.sheetConnections || {};
  const keys = Object.keys(map);
  if (!keys.length) {
    console.warn("Brak sheetConnections w", projPath);
    process.exit(0);
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const key of keys) {
    const list = map[key] || [];
    const base = path.basename(key, path.extname(key));
    const name = "polaczenia_" + base + ".md";
    const text = serializeSheet(key, list, cfg);
    const dest = path.join(outDir, name);
    fs.writeFileSync(dest, text, "utf8");
    console.log("Zapisano", dest, "(" + list.length + " połączeń)");
  }
}

main();
