/**
 * Synchronizuje osadzone definicje symboli w E-01 z biblioteką (kierunek lib → sheet).
 * node edytor/scripts/sync-e01-from-lib.mjs
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

function replaceOrInsertSymbol(svg, id, xml) {
  const block = findTopLevelSymbolBlock(svg, id);
  if (block) {
    return { svg: svg.slice(0, block.start) + xml + svg.slice(block.end), action: "updated" };
  }
  return {
    svg: svg.replace("</defs>", `    ${xml}\n  </defs>`),
    action: "added",
  };
}

function collectUsedSymbolIds(e01) {
  const used = new Set();
  for (const m of e01.matchAll(/href="#([^"]+)"/g)) {
    const id = m[1];
    if (id !== "sch-1") used.add(id);
  }
  return used;
}

const lib = fs.readFileSync(libPath, "utf8");
let e01 = fs.readFileSync(e01Path, "utf8");
const libBlocks = new Map(extractTopLevelSymbolBlocks(extractDefsInner(lib)).map((b) => [b.id, b.xml]));
const used = collectUsedSymbolIds(e01);
const report = [];

for (const id of used) {
  const xml = libBlocks.get(id);
  if (!xml) {
    report.push({ id, action: "missing in lib" });
    continue;
  }
  const { svg, action } = replaceOrInsertSymbol(e01, id, xml);
  e01 = svg;
  report.push({ id, action });
}

fs.writeFileSync(e01Path, e01, "utf8");
console.log("Zsynchronizowano E-01.svg <- E-00_symbole.svg\n");
for (const r of report) console.log(`  ${String(r.action).padEnd(14)} ${r.id}`);
console.log(`\nRazem: ${report.length} symboli użytych na arkuszu.`);
