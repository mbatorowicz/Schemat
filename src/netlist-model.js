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
    if (!cells) return;
    if (cells[0] === "Nr") {
      // v2: Nr|Od|Do|Sygnał|Przewód|Długość|Uwagi — legacy: …|Sygnał|Oznacznik|Przewód|Uwagi
      meta._tableFmt = cells[4] === "Oznacznik" || cells.includes("Oznacznik") ? "legacy" : "v2";
      return;
    }
    const id = cells[0];
    if (!/^\d+[A-Za-z]?$/.test(id)) return;
    const fmt = meta._tableFmt || (cells.length >= 7 && /^`/.test(cells[4] || "") ? "legacy" : "v2");
    if (fmt === "legacy") {
      connections.push({
        id,
        section,
        from: parseEndpoint(cells[1]),
        to: parseEndpoint(cells[2]),
        signal: cells[3],
        net: (cells[4] || "").replace(/^`|`$/g, ""),
        wire: cells[5],
        length: "",
        notes: cells[6],
        rawCells: cells,
      });
    } else {
      connections.push({
        id,
        section,
        from: parseEndpoint(cells[1]),
        to: parseEndpoint(cells[2]),
        signal: "",
        net: (cells[3] || "").replace(/^`|`$/g, ""),
        wire: cells[4],
        length: cells[5] || "",
        notes: cells[6],
        rawCells: cells,
      });
    }
  });
  delete meta._tableFmt;
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

/** Typowe oznaczniki potencjału do UI / auto-uzupełniania. */
export const COMMON_NETS = ["L", "N", "PE", "+24V", "0V", "+48V"];

export function isBlankNet(net) {
  const n = String(net == null ? "" : net)
    .trim()
    .replace(/\u2212/g, "-");
  return !n || n === "—" || n === "-" || n === "–";
}

export function pinKey(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\u2212/g, "-");
}

export function pinAliases(pin) {
  const p = pinKey(pin);
  const map = {
    "V+": ["V+", "+V"],
    "V-": ["V-", "-V"],
    "+V": ["+V", "V+"],
    "-V": ["-V", "V-"],
    ENCODER: ["ENCODER", "ENC"],
  };
  return (map[p] || [p]).map(pinKey);
}

export function endpointKey(ep) {
  const ref = normalizeRef(ep?.ref);
  if (!ref) return "";
  return ref + ":" + pinKey(ep?.pin);
}

/** @deprecated użyj endpointKey */
function endpointKeyOf(ep) {
  return endpointKey(ep);
}

/** Inferuj potencjał z nazw pinów (L/N/PE/…). */
export function inferNetFromPins(record) {
  const pins = [record?.from?.pin, record?.to?.pin].map((p) =>
    String(p || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/\u2212/g, "-")
  );
  for (const pin of pins) {
    if (pin === "L" || pin === "N" || pin === "PE") return pin;
    if (pin === "+48V" || pin === "48V") return "+48V";
    if (pin === "0V" || pin === "PUL0" || pin === "GND" || pin === "M") return "0V";
    if (pin === "+24V" || pin === "24V" || pin === "+V" || pin === "V+" || pin === "24+") return "+24V";
  }
  return "";
}

/**
 * Auto-wypełnij potencjał: istniejący → rodzeństwo ze wspólnym pinem → piny → fallback.
 * @returns {string}
 */
export function inferConnectionNet(record, connections) {
  if (!isBlankNet(record?.net)) return String(record.net).trim();
  const fromKey = endpointKeyOf(record?.from);
  const toKey = endpointKeyOf(record?.to);
  const list = connections || [];
  for (const c of list) {
    if (!c || c.id === record?.id || isBlankNet(c.net)) continue;
    const fk = endpointKeyOf(c.from);
    const tk = endpointKeyOf(c.to);
    if ((fromKey && (fk === fromKey || tk === fromKey)) || (toKey && (fk === toKey || tk === toKey))) {
      return String(c.net).trim();
    }
  }
  const fromPins = inferNetFromPins(record);
  if (fromPins) return fromPins;
  return "—";
}

export function markdownRow(record) {
  const from =
    (record.from && record.from.raw) ||
    [record.from && record.from.ref, record.from && record.from.pin].filter(Boolean).join(":");
  const to =
    (record.to && record.to.raw) || [record.to && record.to.ref, record.to && record.to.pin].filter(Boolean).join(":");
  const n = normalizeConnection(record);
  return (
    "| " +
    (n.id || "NOWE") +
    " | " +
    from +
    " | " +
    to +
    " | `" +
    (n.net || "—") +
    "` | " +
    (n.wire || "do ustalenia") +
    " | " +
    (n.length || "") +
    " | " +
    (n.notes || "propozycja z edytora") +
    " |"
  );
}

export function proposalPreview(records) {
  if (!records || !records.length) return "Brak nowych połączeń.";
  return [
    "| Nr | Od | Do | Sygnał | Przewód | Długość | Uwagi |",
    "|----|----|----|--------|---------|---------|-------|",
    ...records.map(markdownRow),
  ].join("\n");
}

/** Format wiersza dropdownu spisu. */
export function connectionListLabel(record, statusText) {
  const n = normalizeConnection(record);
  const parts = [n.id, (n.from?.raw || "") + " → " + (n.to?.raw || ""), n.net || "—"];
  if (n.wire && n.wire !== "do ustalenia") parts.push(n.wire);
  if (n.length) parts.push(n.length);
  if (statusText) parts.push(statusText);
  return parts.join(" · ");
}

export function endpointRaw(ep) {
  if (ep == null || ep === "") return "";
  if (typeof ep === "string") return cleanCell(ep);
  if (ep.raw) return String(ep.raw).trim();
  const ref = normalizeRef(ep.ref);
  const pin = cleanCell(ep.pin);
  return pin ? ref + ":" + pin : ref;
}

export function normalizeConnection(record) {
  const from = parseEndpoint(endpointRaw(record?.from) || endpointRaw(record?.fromRaw) || "");
  const to = parseEndpoint(endpointRaw(record?.to) || endpointRaw(record?.toRaw) || "");
  let net = cleanCell(record?.net);
  let signal = cleanCell(record?.signal);
  // Migracja: osobne pole signal → Sygnał (=net), gdy net pusty
  if (isBlankNet(net) && signal) {
    net = signal;
    signal = "";
  }
  return {
    id: String(record?.id || "").trim() || "1",
    section: Number(record?.section) || 1,
    from,
    to,
    signal: "",
    net: net || "—",
    wire: cleanCell(record?.wire) || "do ustalenia",
    length: cleanCell(record?.length),
    notes: cleanCell(record?.notes),
  };
}

export function connectionsToJson(list) {
  return (list || []).map((r) => {
    const n = normalizeConnection(r);
    return {
      id: n.id,
      section: n.section,
      from: endpointRaw(n.from),
      to: endpointRaw(n.to),
      net: n.net,
      wire: n.wire,
      length: n.length,
      notes: n.notes,
    };
  });
}

export function connectionsFromJson(list) {
  return (list || []).map((r) =>
    normalizeConnection({
      ...r,
      from: typeof r.from === "string" ? parseEndpoint(r.from) : r.from,
      to: typeof r.to === "string" ? parseEndpoint(r.to) : r.to,
    })
  );
}

export function nextConnectionId(connections) {
  let max = 0;
  for (const c of connections || []) {
    const n = parseInt(String(c.id).replace(/\D/g, ""), 10);
    if (n > max) max = n;
  }
  return String(max + 1);
}

/** Serializacja do markdown (legacy / opcjonalny eksport). */
export function serialize(netlist) {
  const meta = netlist?.meta || {};
  const rows = (netlist?.connections || []).map(markdownRow);
  const sheet = meta.sheet || "";
  const version = meta.version || "1.0";
  const date = meta.date || "";
  return [
    "# Spis połączeń",
    "",
    `| **Wersja** | ${sheet} · ${version} · ${date} |`,
    "",
    "## 1. Połączenia",
    "",
    "| Nr | Od | Do | Sygnał | Przewód | Długość | Uwagi |",
    "|----|----|----|--------|---------|---------|-------|",
    ...rows,
    "",
  ].join("\n");
}

/** Kompatybilność z kodem oczekującym global.NetlistModel */
export const NetlistModel = {
  parse,
  serialize,
  parseEndpoint,
  normalizeRef,
  compareIds,
  wireClass,
  COMMON_NETS,
  isBlankNet,
  inferNetFromPins,
  inferConnectionNet,
  pinKey,
  pinAliases,
  endpointKey,
  connectionListLabel,
  markdownRow,
  proposalPreview,
  normalizeConnection,
  connectionsToJson,
  connectionsFromJson,
  nextConnectionId,
  endpointRaw,
};
