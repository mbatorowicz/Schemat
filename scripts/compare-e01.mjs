import fs from "fs";
import { execSync } from "child_process";

function summary(svg) {
  const uses = [...svg.matchAll(/<use[^>]*href="#([^"]+)"[^>]*data-ref="([^"]*)"[^>]*/g)].map((m) => ({
    sym: m[1],
    ref: m[2],
    x: (m[0].match(/x="([^"]+)"/) || [])[1],
    y: (m[0].match(/y="([^"]+)"/) || [])[1],
  }));
  const lines = (svg.match(/<line /g) || []).length;
  const polys = (svg.match(/<polyline /g) || []).length;
  const texts = [...svg.matchAll(/class="did"[^>]*>([^<]*)</g)].map((m) => m[1]);
  return { uses, lines, polys, texts, bytes: svg.length };
}

for (const rev of ["HEAD", "5cf4f8e", "2cd929c", "9683e19", "c1f008f"]) {
  const svg =
    rev === "HEAD"
      ? fs.readFileSync("schematy/project/CS-TB-48/E-01.svg", "utf8")
      : execSync(`git show ${rev}:schematy/project/CS-TB-48/E-01.svg`, { encoding: "utf8" });
  const s = summary(svg);
  console.log("\n===", rev, "===");
  console.log("bytes", s.bytes, "lines", s.lines, "polylines", s.polys);
  console.log("instances:", s.uses.map((u) => `${u.ref}:${u.sym}@${u.x},${u.y}`).join(" | "));
  console.log("labels:", s.texts.join(" | "));
}
