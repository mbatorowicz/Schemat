/**
 * Ustawia wzorcowy E-01.svg jako SSOT: nadpisuje arkusz i synchronizuje symbole do biblioteki.
 * Usuwa sprzeczne definicje (np. SK1 — instancja to data-ref na #NO, nie osobny symbol).
 *
 *   node edytor/scripts/apply-e01-reference.mjs [ścieżka-do-wzorca.svg]
 *
 * Po zapisie uruchamia clean-lib-conflicts.mjs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const e01Path = path.join(root, "schematy/project/CS-TB-48/E-01.svg");
const libPath = path.join(root, "schematy/lib/E-00_symbole.svg");
const refPath = process.argv[2] || e01Path;

function extractDefsInner(svg) {
  const m = svg.match(/<defs>([\s\S]*)<\/defs>/);
  return m ? m[1] : "";
}

function extractTopLevelSymbolBlocks(defsInner) {
  const blocks = [];
  let i = 0;
  while (i < defsInner.length) {
    const start = defsInner.indexOf('<g id="', i);
    if (start < 0) break;
    let depth = 0;
    let pos = start;
    let end = -1;
    while (pos < defsInner.length) {
      const nextOpen = defsInner.indexOf("<g", pos);
      const nextClose = defsInner.indexOf("</g>", pos);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 2;
      } else {
        depth--;
        pos = nextClose + 4;
        if (depth === 0) {
          end = pos;
          break;
        }
      }
    }
    if (end <= start) break;
    const xml = defsInner.slice(start, end).trim();
    const idM = xml.match(/^<g id="([^"]+)"/);
    if (idM) blocks.push({ id: idM[1], xml });
    i = end;
  }
  return blocks;
}

function findTopLevelSymbolBlock(svg, id, from = 0) {
  const marker = `<g id="${id}"`;
  const start = svg.indexOf(marker, from);
  if (start < 0) return null;
  let depth = 0;
  let pos = start;
  while (pos < svg.length) {
    const nextOpen = svg.indexOf("<g", pos);
    const nextClose = svg.indexOf("</g>", pos);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 2;
    } else {
      depth--;
      pos = nextClose + 4;
      if (depth === 0) return { start, end: pos };
    }
  }
  return null;
}

function replaceOrInsertSymbol(lib, id, xml) {
  const formatted = "    " + xml;
  const block = findTopLevelSymbolBlock(lib, id);
  if (block) {
    return { lib: lib.slice(0, block.start) + formatted + lib.slice(block.end), action: "updated" };
  }
  return { lib: lib.replace("</defs>", `${formatted}\n  </defs>`), action: "added" };
}

function removeSymbol(lib, id) {
  const block = findTopLevelSymbolBlock(lib, id);
  if (!block) return { lib, removed: false };
  return { lib: lib.slice(0, block.start) + lib.slice(block.end), removed: true };
}

const reference = fs.readFileSync(refPath, "utf8");
fs.writeFileSync(e01Path, reference, "utf8");

const refBlocks = extractTopLevelSymbolBlocks(extractDefsInner(reference));
const refIds = new Set(refBlocks.map((b) => b.id));

let lib = fs.readFileSync(libPath, "utf8");
const report = [];

for (const { id, xml } of refBlocks) {
  const { lib: next, action } = replaceOrInsertSymbol(lib, id, xml);
  lib = next;
  report.push({ id, action });
}

const removeIds = ["SK1", "NO-2", "Przylacze", "Xx-3", "sk1"];
for (const id of removeIds) {
  const { lib: next, removed } = removeSymbol(lib, id);
  if (removed) report.push({ id, action: "removed (conflict)" });
  lib = next;
}

fs.writeFileSync(libPath, lib, "utf8");

console.log("Zastosowano wzorzec E-01 → projekt + biblioteka\n");
for (const r of report) console.log(`  ${String(r.action).padEnd(22)} ${r.id}`);

const uses = [...reference.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const libIds = new Set([...lib.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]));
const missing = [...new Set(uses)].filter((u) => u !== "sch-1" && !libIds.has(u));
console.log(
  missing.length ? `\nBrakujące w bibliotece: ${missing.join(", ")}` : "\nWszystkie href z arkusza są w bibliotece."
);
console.log(`\nSymbole w defs wzorca: ${[...refIds].join(", ")}`);
console.log(
  `SK1 na arkuszu: ${reference.includes('data-ref="SK1"') && reference.includes('href="#NO"') ? "instancja #NO ✓" : "?"}`
);
