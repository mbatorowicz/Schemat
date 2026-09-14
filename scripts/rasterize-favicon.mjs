import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

function svgMarkup(file, size) {
  const raw = readFileSync(join(publicDir, file), "utf8");
  return raw.replace("<svg", `<svg width="${size}" height="${size}"`);
}

function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(svgFile, size, outName, { transparent }) {
  await page.setViewportSize({ width: size, height: size });
  const bg = transparent ? "transparent" : "#0f172a";
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;width:${size}px;height:${size}px;background:${bg};}
      svg{display:block}
    </style></head><body>${svgMarkup(svgFile, size)}</body></html>`,
    { waitUntil: "load" }
  );
  const buf = await page.screenshot({
    type: "png",
    omitBackground: transparent,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  writeFileSync(join(publicDir, outName), buf);
  return buf;
}

const fav32 = await render("favicon.svg", 32, "favicon-32.png", { transparent: true });
await render("apple-touch-icon.svg", 180, "apple-touch-icon.png", { transparent: false });
writeFileSync(join(publicDir, "favicon.ico"), pngToIco(fav32));

await browser.close();
console.log("favicon assets written");
