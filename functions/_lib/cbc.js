// Catehismul Bisericii Catolice (ed. română, credinta-catolica.ro). Indexul verset→paragraf se construiește o dată (KV "CCC").
import { toLines, getHtml } from "./catena.js";
export const BASE = "https://www.credinta-catolica.ro/cbc/";
const GOSP = { Mt: 1, Mc: 1, Lc: 1, In: 1 };
export function pageLinks(html) {
  const skip = new Set(["cuprins-detaliat", "lista-siglelor", "abrevieri-biblice"]), set = new Set(), re = /href="(https:\/\/www\.credinta-catolica\.ro\/cbc\/([a-z0-9-]+)\/)(?:#[^"]*)?"/gi; let m;
  while ((m = re.exec(html))) if (!skip.has(m[2])) set.add(m[1]);
  return [...set];
}
const nrm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\s]/g, "");
const NOISE = new Set(["cf", "vol", "pag", "nr", "art", "cap", "nota", "can", "par", "sec", "sess", "ep", "hom", "serm", "lib", "pl", "pg", "ps"].filter(x => x !== "ps"));
const AMBIG = new Set(["am", "is", "os", "ab", "in", "za", "na", "ha", "so", "ag", "ba", "ion", "mi", "pr", "ct", "ez", "ml"]);
const ONE = new Set(["Ab", "Flm", "2In", "3In", "Iuda"]);
export const aliasMap = books => { const m = new Map(); for (const b of books) for (const a of b.al) m.set(nrm(a), b.abbr); return m; };
// Trimiteri biblice în format românesc: „Mt 6, 9-13”, „1 Cor 11, 26”, „Lc 1, 26-38.31”, „Mt 5-7”.
export function parseRefs(s, AL, unk) {
  const out = [], re = /(?<![\w])((?:[123]\s?)?[A-ZĂÂÎȘȚ][A-Za-zăâîșțĂÂÎȘȚ]{1,8})\.?\s+(\d{1,3})(?:\s*,\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?(?:\s*\.\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)*)|\s*[-–]\s*(\d{1,3}))?/g; let m;
  while ((m = re.exec(s))) {
    const tok = nrm(m[1]), b = AL.get(tok), hasV = !!m[3];
    if (!b) { if (hasV && unk && !NOISE.has(tok) && !/^\d/.test(tok)) unk[m[1]] = (unk[m[1]] || 0) + 1; continue; }
    const n = +m[2];
    if (ONE.has(b) && !hasV && !m[4]) { out.push({ b, c: 1, f: n, t: n, w: 0 }); continue; }
    if (hasV) for (const part of m[3].split(".")) { const [x, y] = part.split(/[-–]/).map(v => +v.trim()); out.push({ b, c: n, f: x, t: y || x, w: 0 }); }
    else if (m[4]) for (let k = n; k <= Math.min(+m[4], n + 9); k++) out.push({ b, c: k, f: 1, t: 999, w: 1 });
    else if (!AMBIG.has(tok) && (tok.length >= 3 || tok === "ps")) out.push({ b, c: n, f: 1, t: 999, w: 1 });
  }
  return out;
}
export function parsePage(html, AL, unk) {
  html = html.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n@@H@@$1\n");
  const paras = [], notes = {}; let last = 0, cur = null, inNotes = false;
  for (const l of toLines(html)) {
    if (l.startsWith("@@H@@")) { cur = null; if (/^Note$/i.test(l.slice(5).trim())) inNotes = true; continue; }
    if (/^Note$/i.test(l)) { inNotes = true; cur = null; continue; }
    if (inNotes) { const m = l.match(/^\[(\d+)\]\s*(.*)$/); if (m) notes[+m[1]] = m[2]; else if (/^©|^Important/.test(l)) break; continue; }
    const m = l.match(/^(\d{1,4})\.\s+(.*)$/);
    if (m && (last === 0 || +m[1] === last + 1)) { last = +m[1]; cur = { n: last, text: m[2] }; paras.push(cur); continue; }
    if (cur && !/^(Completări|Adresa ta)/.test(l)) cur.text += "\n" + l;
  }
  for (const p of paras) {
    const marks = [...p.text.matchAll(/\[(\d+)\]/g)].map(x => +x[1]);
    p.refs = parseRefs(p.text.replace(/\[\d+\]/g, "") + " ; " + marks.map(k => notes[k] || "").join(" ; "), AL, unk);
    p.text = p.text.replace(/\[?\[\d+\]\]?/g, "").replace(/[ \t]+/g, " ").trim();
  }
  return paras;
}
export async function buildStep(env, step, books) {
  if (step === 0) {
    const pages = pageLinks(await getHtml(BASE));
    await env.CCC.put("pages", JSON.stringify(pages)); await env.CCC.put("idx", "[]"); await env.CCC.put("unk", "{}");
    return { total: pages.length, steps: Math.ceil(pages.length / 5) };
  }
  const AL = aliasMap(books), pages = JSON.parse((await env.CCC.get("pages")) || "[]"), idx = JSON.parse((await env.CCC.get("idx")) || "[]"), unk = JSON.parse((await env.CCC.get("unk")) || "{}");
  for (const u of pages.slice((step - 1) * 5, step * 5))
    for (const p of parsePage(await getHtml(u), AL, unk)) if (p.refs.length) idx.push({ n: p.n, u, r: p.refs.map(r => [r.b, r.c, r.f, r.t, r.w]) });
  await env.CCC.put("idx", JSON.stringify(idx)); await env.CCC.put("unk", JSON.stringify(unk));
  const done = step * 5 >= pages.length;
  return { done, paragraphs: idx.length, unknown: done ? Object.entries(unk).sort((a, b) => b[1] - a[1]).slice(0, 15) : undefined };
}
export async function cbcItems(env, abbr, ch, from, to, whole) {
  if (!env.CCC) return { items: [], notice: "Catehism: lipsește bindingul KV „CCC” (vezi README)." };
  const idx = JSON.parse((await env.CCC.get("idx")) || "[]");
  if (!idx.length) return { items: [], notice: "Catehism: indexul nu e construit încă (deschide /admin-index.html o singură dată)." };
  const hits = [];
  for (const e of idx) { const r = e.r.find(x => x[0] === abbr && x[1] === ch && (!x[4] || whole) && x[2] <= to && x[3] >= from); if (r) hits.push({ e, r }); }
  hits.sort((a, b) => a.e.n - b.e.n);
  const cache = new Map(), items = [];
  for (const { e, r } of hits.slice(0, 12)) {
    if (!cache.has(e.u)) cache.set(e.u, parsePage(await getHtml(e.u), new Map(), null));
    const p = cache.get(e.u).find(x => x.n === e.n); if (!p) continue;
    items.push({ id: "cbc-" + e.n, status: "published", book: abbr, chapter: ch, verse_from: r[4] ? from : r[2], verse_to: r[4] ? to : r[3],
      source_type: "catechism", title: "Catehismul Bisericii Catolice", author: "", locator: "§" + e.n, original_lang: "ro",
      original_text: p.text.length > 2500 ? p.text.slice(0, 2500) + "…" : p.text, translation_status: "official", source_url: e.u,
      license: "© ARCB / Libreria Editrice Vaticana – citat de pe credinta-catolica.ro, cu trimitere la sursă", order: e.n });
  }
  return { items, truncated: hits.length > 12 };
}
