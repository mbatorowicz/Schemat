"use strict";

function cleanCell(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function normalizeRef(value) {
  return cleanCell(value).replace(/^-/, "").trim();
}

export function parseEndpoint(value) {
  const raw = cleanCell(value);
  const colon = raw.indexOf(":");
  if (colon < 0) return { raw, ref: normalizeRef(raw), pin: "" };
  return { raw, ref: normalizeRef(raw.slice(0, colon)), pin: cleanCell(raw.slice(colon + 1)) };
}

function parseTableRow(line) {
  if (!/^\s*\|/.test(line)) return null;
  const cells = line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map(cleanCell);
  if (cells.length < 7 || /^-+$/.test(cells[0])) return null;
  return cells;
}

export function compareIds(a, b) {
  const ma = String(a).match(/^(\d+)(.*)$/);
  const mb = String(b).match(/^(\d+)(.*)$/);
  if (ma && mb) {
    const d = parseInt(ma[1], 10) - parseInt(mb[1], 10);
    if (d) return d;
    return ma[2].localeCompare(mb[2], "pl");
  }
  return String(a).localeCompare(String(b), "pl", { numeric: true });
}

export function parse(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const connections = [];
  let section = 0;
  let inConnections = false;
  let meta = { sheet: "", version: "", date: "" };
  lines.forEach((line) => {
    const version = line.match(/\|\s*\*\*Wersja\*\*\s*\|\s*([^|]+)\|/i);
    if (version) {
      const parts = cleanCell(version[1])
        .split("·")
        .map((s) => s.trim());
      meta = { sheet: parts[0] || "", version: parts[1] || "", date: parts[2] || "" };
    }
    const heading = line.match(/^##\s+(\d+)\./);
    if (heading) {
      section = parseInt(heading[1], 10);
      inConnections = section >= 1 && section <= 6;
      return;
    }
    if (!inConnections) return;
    const cells = parseTableRow(line);
    if (!cells || cells[0] === "Nr") return;
    const id = cells[0];
    if (!/^\d+[A-Za-z]?$/.test(id)) return;
    connections.push({
      id,
      section,
      from: parseEndpoint(cells[1]),
      to: parseEndpoint(cells[2]),
      signal: cells[3],
      net: cells[4].replace(/^`|`$/g, ""),
      wire: cells[5],
      notes: cells[6],
      rawCells: cells,
    });
  });
  connections.sort((a, b) => compareIds(a.id, b.id));
  return { meta, connections, source: String(markdown || "") };
}

export function wireClass(record) {
  const net = String((record && record.net) || "").toUpperCase();
  if (net === "L") return "wL";
  if (net === "N") return "wN";
  if (net === "PE") return "wPE";
  if (net === "+48V") return "w48";
  if (net === "0V" || net === "PUL0") return "w0v";
  if (net.indexOf("ESTOP") === 0) return "wsafe";
  if (net.indexOf("ENC") >= 0) return "wenc";
  if (net.indexOf("M1.") === 0 || net.indexOf("M2.") === 0 || net.indexOf("R1-") === 0 || net === "B1S" || net === "Y1")
    return "wsig";
  return "w24";
}

export function markdownRow(record) {
  const from =
    (record.from && record.from.raw) ||
    [record.from && record.from.ref, record.from && record.from.pin].filter(Boolean).join(":");
  const to =
    (record.to && record.to.raw) || [record.to && record.to.ref, record.to && record.to.pin].filter(Boolean).join(":");
  return (
    "| " +
    (record.id || "NOWE") +
    " | " +
    from +
    " | " +
    to +
    " | " +
    (record.signal || "") +
    " | `" +
    (record.net || "—") +
    "` | " +
    (record.wire || "do ustalenia") +
    " | " +
    (record.notes || "propozycja z edytora") +
    " |"
  );
}

export function proposalPreview(records) {
  if (!records || !records.length) return "Brak nowych połączeń.";
  return [
    "| Nr | Od | Do | Sygnał | Oznacznik | Przewód | Uwagi |",
    "|----|----|----|--------|-----------|---------|-------|",
    ...records.map(markdownRow),
  ].join("\n");
}

/** Kompatybilność z kodem oczekującym global.NetlistModel */
export const NetlistModel = { parse, parseEndpoint, normalizeRef, compareIds, wireClass, markdownRow, proposalPreview };
