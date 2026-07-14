/** Usuwa sprzeczne symbole z biblioteki (SK1, NO-2 — SK1 to instancja #NO). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const libPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../schematy/lib/E-00_symbole.svg");

function findBlock(s, id) {
  const marker = `<g id="${id}"`;
  const start = s.indexOf(marker);
  if (start < 0) return null;
  let depth = 0;
  let p = start;
  while (p < s.length) {
    const o = s.indexOf("<g", p);
    const c = s.indexOf("</g>", p);
    if (c < 0) break;
    if (o >= 0 && o < c) {
      depth++;
      p = o + 2;
    } else {
      depth--;
      p = c + 4;
      if (depth === 0) return { start, end: p };
    }
  }
  return null;
}

let lib = fs.readFileSync(libPath, "utf8");
for (const id of ["SK1", "NO-2", "Przylacze", "Xx-3", "sk1"]) {
  const b = findBlock(lib, id);
  if (b) {
    lib = lib.slice(0, b.start) + lib.slice(b.end);
    console.log("removed", id);
  }
}
fs.writeFileSync(libPath, lib, "utf8");
console.log("Biblioteka oczyszczona.");
