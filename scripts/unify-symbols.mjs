/**
 * Jednorazowa unifikacja id symboli w plikach SVG projektu.
 * node scripts/unify-symbols.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SYMBOL_ID_ALIASES, canonicalSymbolId } from "../src/symbol-aliases.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const libPath = path.join(root, "schematy/lib/E-00_symbole.svg");
const e01Path = path.join(root, "schematy/project/CS-TB-48/E-01.svg");

function rewriteHref(svg, oldId, newId) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return svg
    .replace(new RegExp(`href="#${esc(oldId)}"`, "g"), `href="#${newId}"`)
    .replace(new RegExp(`xlink:href="#${esc(oldId)}"`, "g"), `xlink:href="#${newId}"`)
    .replace(new RegExp(`data-sym="${esc(oldId)}"`, "g"), `data-sym="${newId}"`);
}

function renameGId(svg, oldId, newId) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let out = rewriteHref(svg, oldId, newId);
  out = out.replace(new RegExp(`<g id="${esc(oldId)}"`, "g"), `<g id="${newId}"`);
  return out;
}

function extractGById(svg, id) {
  const re = new RegExp(`<g id="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?</g>`);
  const m = svg.match(re);
  return m ? m[0] : null;
}

// --- biblioteka: rename legacy ids ---
let lib = fs.readFileSync(libPath, "utf8");
for (const [oldId, newId] of Object.entries(SYMBOL_ID_ALIASES)) {
  if (oldId === newId) continue;
  if (!lib.includes(`id="${oldId}"`)) continue;
  if (lib.includes(`id="${newId}"`) && oldId !== newId) {
    console.warn(`LIB: pomijam ${oldId}→${newId} (cel już istnieje)`);
    continue;
  }
  lib = renameGId(lib, oldId, newId);
  console.log(`LIB: ${oldId} → ${newId}`);
}

// X-3: skopiuj z E-01 (Xx-3) jeśli brak w bibliotece
let e01 = fs.readFileSync(e01Path, "utf8");
if (!lib.includes('id="X-3"')) {
  const src = extractGById(e01, "Xx-3") || extractGById(e01, "X-3");
  if (src) {
    const block = src.replace(/id="Xx-3"/, 'id="X-3"');
    lib = lib.replace("</defs>", `  ${block}\n  </defs>`);
    console.log("LIB: dodano X-3 z arkusza E-01");
  }
}

fs.writeFileSync(libPath, lib, "utf8");

// --- arkusz E-01: href, data-sym, osadzone defs ---
for (const [oldId, newId] of Object.entries(SYMBOL_ID_ALIASES)) {
  if (oldId === newId) continue;
  if (!e01.includes(oldId)) continue;
  e01 = renameGId(e01, oldId, newId);
  console.log(`E01: ${oldId} → ${newId}`);
}

fs.writeFileSync(e01Path, e01, "utf8");
console.log("Gotowe.");

// weryfikacja
const lib2 = fs.readFileSync(libPath, "utf8");
const e012 = fs.readFileSync(e01Path, "utf8");
const libIds = [...lib2.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]);
const uses = [...new Set([...e012.matchAll(/href="#([^"]+)"/g)].map((m) => canonicalSymbolId(m[1])))];
const missing = uses.filter((u) => !libIds.includes(u));
console.log("Brakujące w bibliotece po unifikacji:", missing.length ? missing.join(", ") : "(brak)");
