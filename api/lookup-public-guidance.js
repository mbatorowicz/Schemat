/**
 * Publiczne wskazówki normatywne (Wikipedia + DuckDuckGo) — bez płatnych PDF-ów IEC/EN.
 * @param {string} query
 * @param {{ fetchImpl?: typeof fetch, signal?: AbortSignal }} [opts]
 */
const UA = "SchematEditor/1.0 (electrical CAD assistant; +https://github.com/mbatorowicz/Schemat)";

function clip(s, n = 900) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

async function getJson(fetchImpl, url, signal) {
  const res = await fetchImpl(url, {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function wikipediaHits(fetchImpl, query, signal) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=" +
    encodeURIComponent(query);
  const data = await getJson(fetchImpl, url, signal);
  const hits = data?.query?.search || [];
  const out = [];
  for (const h of hits.slice(0, 3)) {
    const title = h.title;
    const pageUrl = "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(title).replace(/ /g, "_"));
    let extract = clip(h.snippet?.replace(/<[^>]+>/g, "") || "");
    try {
      const sum = await getJson(
        fetchImpl,
        "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title),
        signal
      );
      if (sum?.extract) extract = clip(sum.extract);
      const canonical = sum?.content_urls?.desktop?.page;
      out.push({ title, url: canonical || pageUrl, extract });
    } catch {
      out.push({ title, url: pageUrl, extract });
    }
  }
  return out;
}

async function duckDuckGo(fetchImpl, query, signal) {
  const url = "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + encodeURIComponent(query);
  const data = await getJson(fetchImpl, url, signal);
  const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
  const topics = related
    .flatMap((t) => (t?.Topics ? t.Topics : [t]))
    .filter((t) => t?.FirstURL && t?.Text)
    .slice(0, 4)
    .map((t) => ({ title: clip(t.Text, 80), url: t.FirstURL, extract: clip(t.Text, 280) }));
  const abstract = clip(data?.AbstractText || "");
  const absUrl = data?.AbstractURL || "";
  return {
    heading: data?.Heading || "",
    abstract,
    url: absUrl,
    topics,
  };
}

export async function lookupPublicGuidance(query, opts = {}) {
  const q = String(query || "")
    .trim()
    .slice(0, 200);
  if (!q) return { ok: false, error: "Puste zapytanie." };
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") return { ok: false, error: "Brak fetch." };
  const signal = opts.signal;
  const sources = [];
  const errors = [];
  try {
    const wiki = await wikipediaHits(fetchImpl, q, signal);
    wiki.forEach((s) => sources.push({ ...s, provider: "wikipedia" }));
  } catch (e) {
    errors.push("wikipedia: " + (e?.message || e));
  }
  try {
    const ddg = await duckDuckGo(fetchImpl, q, signal);
    if (ddg.abstract && ddg.url) {
      sources.push({ title: ddg.heading || q, url: ddg.url, extract: ddg.abstract, provider: "duckduckgo" });
    }
    ddg.topics.forEach((t) => sources.push({ ...t, provider: "duckduckgo" }));
  } catch (e) {
    errors.push("duckduckgo: " + (e?.message || e));
  }
  if (!sources.length) {
    return { ok: false, error: errors[0] || "Brak publicznych wyników.", sources: [] };
  }
  return {
    ok: true,
    query: q,
    note: "To nie jest pełny tekst normy. Cytuj URL; przy braku pewności napisz, że treść jest niepewna.",
    sources: sources.slice(0, 8),
  };
}
