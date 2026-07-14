import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "schematy/edytor.html"), "utf8");
const m = html.match(
  /<script src="js\/orthogonal-router\.js"><\/script>\s*<script>([\s\S]*?)<\/script>/
);
if (!m) throw new Error("script block not found");
let js = m[1].replace(/^"use strict";\n?/, "");
const header = `import { connAllCss, syncConnStylesInLib } from './conn-theme.js';
import { createConnModel } from './conn-model.js';
import { NetlistModel } from './netlist-model.js';
import { OrthogonalRouter } from './orthogonal-router.js';

`;
fs.writeFileSync(path.join(root, "edytor/src/main.js"), header + js);
const idx = html.replace(
  /<script src="js\/netlist-model\.js"><\/script>\s*<script src="js\/orthogonal-router\.js"><\/script>\s*<script>[\s\S]*?<\/script>/,
  '<script type="module" src="/src/main.js"></script>'
);
fs.writeFileSync(path.join(root, "edytor/index.html"), idx);
console.log("OK", (header + js).split("\n").length, "lines");
