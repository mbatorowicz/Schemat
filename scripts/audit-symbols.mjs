import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lib = fs.readFileSync(path.join(root, "schematy/lib/E-00_symbole.svg"), "utf8");
const e01 = fs.readFileSync(path.join(root, "schematy/project/CS-TB-48/E-01.svg"), "utf8");

const libIds = [...lib.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]);
const uses = [...new Set([...e01.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
const dataSym = [...new Set([...e01.matchAll(/data-sym="([^"]+)"/g)].map((m) => m[1]))];
const defsBlock = e01.match(/<defs>[\s\S]*?<\/defs>/)?.[0] || "";
const defsIds = [...defsBlock.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1]);

console.log("LIB:", libIds.join(", "));
console.log("E01 uses:", uses.join(", "));
console.log("E01 data-sym:", dataSym.join(", "));
console.log("E01 defs:", defsIds.join(", "));
console.log("uses missing in lib:", uses.filter((u) => !libIds.includes(u)).join(", "));
console.log("data-sym missing in lib:", dataSym.filter((u) => !libIds.includes(u)).join(", "));
console.log("defs not in lib:", defsIds.filter((d) => !libIds.includes(d)).join(", "));
