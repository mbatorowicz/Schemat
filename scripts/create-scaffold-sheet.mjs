/**
 * Szablon arkusza A4 z ramką dokumentu (multi-sheet CS-TB-48).
 * Użycie: node scripts/create-scaffold-sheet.mjs <SheetName> <DocTitle> <out.svg>
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

const [, , sheetName, docTitle, outPath] = process.argv;
if (!sheetName || !docTitle || !outPath) {
  console.error("Usage: node create-scaffold-sheet.mjs <SheetName> <DocTitle> <out.svg>");
  process.exit(1);
}

const styles = `.fr{fill:none;stroke:var(--object-stroke,#0f172a);stroke-width:2;}
.fr2{fill:none;stroke:var(--object-stroke,#0f172a);stroke-width:1;}
.ttl{font:700 22px Arial,sans-serif;fill:#0f172a;}
.sub{font:400 11px Arial,sans-serif;fill:#475569;}
.tb{font:400 11px Arial,sans-serif;fill:#0f172a;}
.tbb{font:700 11px Arial,sans-serif;fill:#0f172a;}
.sym{fill:none;stroke:var(--object-stroke,#0f172a);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
.node{fill:var(--object-stroke,#0f172a);}
.pin{font:400 9px Arial,sans-serif;fill:var(--object-stroke,#334155);}
.did{font:700 12px Arial,sans-serif;fill:var(--object-stroke,#0f172a);}
.conn-stub{fill:none;stroke:var(--object-stroke,#0f172a);stroke-width:1.5;stroke-linecap:butt;}
.conn-joint{fill:none;stroke:var(--object-stroke,#0f172a);stroke-width:1.5;pointer-events:none;}
.conn-contact{fill:#dc2626;stroke:none;pointer-events:none;}`;

const chrome = `<rect x="12" y="12" width="1461" height="1026" class="fr" style="stroke-width: 1.5; stroke: rgb(0, 0, 0);"/>
<rect x="20" y="20" width="1445" height="1010" class="fr2" style="stroke-width: 1.5; stroke: rgb(0, 0, 0);"/>
<text x="34" y="52" class="ttl" style="fill: rgb(0, 0, 0);">Transporter boczny do drukarki</text>
<text x="34" y="72" class="sub" style="fill: rgb(0, 0, 0);">CNC Solutions  ·  EN 60204-1</text>
<rect x="34" y="896" width="1417" height="120" class="fr" style="stroke: rgb(0, 0, 0);"/>
<line x1="884" y1="896" x2="884" y2="1016" class="fr2" style="stroke: rgb(0, 0, 0);"/>
<line x1="34" y1="924" x2="884" y2="924" class="fr2" style="stroke: rgb(0, 0, 0);"/>
<text x="46" y="915" class="tbb" style="fill: rgb(0, 0, 0);">Dokument</text>
<text x="46" y="948" class="tb" style="fill: rgb(0, 0, 0);">${docTitle}</text>
<line x1="1168" y1="896" x2="1168" y2="1016" class="fr2" style="stroke: rgb(0, 0, 0);"/>
<line x1="884" y1="936" x2="1451" y2="936" class="fr2" style="stroke: rgb(0, 0, 0);"/>
<line x1="884" y1="976" x2="1451" y2="976" class="fr2" style="stroke: rgb(0, 0, 0);"/>
<text x="892" y="911" class="tbb" style="fill: rgb(0, 0, 0);">Nr seryjny</text>
<text x="892" y="928" class="tb" style="fill: rgb(0, 0, 0);">CS-TB-2026-001</text>
<text x="1175.5" y="911" class="tbb" style="fill: rgb(0, 0, 0);">Wytwórca</text>
<text x="1175.5" y="928" class="tb" style="fill: rgb(0, 0, 0);">CNC Solutions</text>
<text x="892" y="951" class="tbb" style="fill: rgb(0, 0, 0);">Wersja</text>
<text x="892" y="968" class="tb" style="fill: rgb(0, 0, 0);">1.0</text>
<text x="1175.5" y="951" class="tbb" style="fill: rgb(0, 0, 0);">Arkusz</text>
<text x="1175.5" y="968" class="tb" style="fill: rgb(0, 0, 0);">${sheetName}</text>
<text x="892" y="991" class="tbb" style="fill: rgb(0, 0, 0);">Norma</text>
<text x="892" y="1008" class="tb" style="fill: rgb(0, 0, 0);">EN 60204-1</text>
<text x="1175.5" y="991" class="tbb" style="fill: rgb(0, 0, 0);">Data</text>
<text x="1175.5" y="1008" class="tb" style="fill: rgb(0, 0, 0);">2026-07-13</text>`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1485 1050" width="1485" height="1050">
  <defs><style>${styles}</style></defs>
  <g id="sch-1">${chrome}</g>
</svg>
`;

writeFileSync(resolve(outPath), svg, "utf8");
console.log("Wrote", outPath);
