/**
 * Synchronizuje definicje symboli w bibliotece z osadzonymi defs arkusza E-01.
 * UWAGA: kierunek E-01 → lib — NIE używać przy naprawie symboli (nadpisze poprawną bibliotekę starymi defs z arkusza).
 * Do naprawy arkusza użyj sync-e01-from-lib.mjs (lib → E-01).
 * node edytor/scripts/sync-lib-from-e01.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const e01Path = path.join(root, "schematy/project/CS-TB-48/E-01.svg");
const libPath = path.join(root, "schematy/lib/E-00_symbole.svg");

function extractDefsInner(svg) {
  const m = svg.match(/<defs>([\s\S]*)<\/defs>/);
  return m ? m[1] : "";
}

/** Top-level <g id="..."> w sekcji defs (pomija <style>). */
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

/** Zamienia top-level <g id="..."> z uwzględnieniem zagnieżdżonych <g>. */
function findTopLevelSymbolBlock(svg, id) {
  const marker = `<g id="${id}"`;
  const start = svg.indexOf(marker);
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

function replaceOrInsertSymbol(lib, id, xml, indent = "    ") {
  const formatted = xml
    .split("\n")
    .map((line) => indent + line)
    .join("\n")
    .trimEnd();
  const block = findTopLevelSymbolBlock(lib, id);
  if (block) {
    return { lib: lib.slice(0, block.start) + formatted + lib.slice(block.end), action: "updated" };
  }
  return { lib: lib.replace("</defs>", `${formatted}\n  </defs>`), action: "added" };
}

const e01 = fs.readFileSync(e01Path, "utf8");
let lib = fs.readFileSync(libPath, "utf8");
const blocks = extractTopLevelSymbolBlocks(extractDefsInner(e01));
const skip = new Set(["sch-1"]);
const report = [];

for (const { id, xml } of blocks) {
  if (skip.has(id)) continue;
  const { lib: next, action } = replaceOrInsertSymbol(lib, id, xml);
  lib = next;
  report.push({ id, action, bytes: xml.length });
}

fs.writeFileSync(libPath, lib, "utf8");
console.log("Zsynchronizowano z E-01.svg -> E-00_symbole.svg\n");
for (const r of report) console.log(`  ${r.action.padEnd(7)} ${r.id} (${r.bytes} B)`);
console.log(`\nRazem: ${report.length} symboli.`);

// weryfikacja: href z E-01 dostępne w bibliotece
const libIds = new Set([...lib.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]));
const uses = new Set([...e01.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]));
const missing = [...uses].filter((u) => !libIds.has(u) && u !== "sch-1");
console.log(
  missing.length ? `Brakujące w bibliotece: ${missing.join(", ")}` : "Wszystkie href z E-01 są w bibliotece."
);
