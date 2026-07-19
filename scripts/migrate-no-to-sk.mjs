import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "../..");
const files = ["schematy/project/CS-TB-48/Zasilanie.svg", "schematy/project/CS-TB-48/Bezpieczenstwo.svg"];

for (const rel of files) {
  const p = resolve(root, rel);
  let t = readFileSync(p, "utf8");
  const before = t;
  t = t.replace(/<g id="NO">[\s\S]*?<\/g>/, "");
  t = t.replace(/href="#NO"/g, 'href="#SK"');
  t = t.replace(/xlink:href="#NO"/g, 'xlink:href="#SK"');
  t = t.replace(/data-sym="NO"/g, 'data-sym="SK"');
  if (t !== before) {
    writeFileSync(p, t);
    console.log("Updated", rel);
  }
}
