// Preia și parsează Catena Aurea (Toma d'Aquino) de pe CCEL. Doar Evangheliile.
export const CATENA = { Mt: 1, Mc: 2, Lc: 3, In: 4 };
const UA = { "user-agent": "ResursePredici/1.0 (instrument de studiu necomercial)" };
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–" };
const dec = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
export async function getHtml(url) {
  const r = await fetch(url, { headers: UA, cf: { cacheTtl: 604800, cacheEverything: true } });
  if (!r.ok) throw new Error("upstream " + r.status);
  return r.text();
}
export function findChapterUrl(tocHtml, ch) {
  const re = /<a[^>]*href="([^"]+)"[^>]*>\s*Chapter\s+(\d+)\s*<\/a>/gi; let m;
  while ((m = re.exec(tocHtml))) if (+m[2] === ch) return new URL(m[1], "https://ccel.org").href;
  return null;
}
export function toLines(h) {
  h = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<hr[^>]*>/gi, "\n@@HR@@\n")
    .replace(/<\/(p|div|h\d|li|tr|table|blockquote)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  return dec(h).split("\n").map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}
const H = /^(?:Ver\.?\s*)?(\d{1,3})\s*(?:[-–]\s*(\d{1,3}))?\.\s+\S/;
const clean = p => p.replace(/\[ed\.? ?note[^\]]*\]/gi, "").replace(/([a-z’,;:)])(\d{1,2})(?=\s[A-Za-z“‘])/g, "$1").replace(/\s+/g, " ").trim();
export function parseChapter(html) {
  const blocks = []; let cur = null, prev = "start";
  for (const l of toLines(html)) {
    if (/^Please\s+login/i.test(l)) break;
    if (l === "@@HR@@") { prev = "hr"; continue; }
    if (/^\d{1,3}$/.test(l) || /«\s*Prev|Next\s*»/.test(l) || /^(Explain|Modernize|Background|VIEWNAME)/.test(l) || /^\[ed\.? ?note/i.test(l)) continue;
    const m = l.match(H);
    if (m && (prev === "hr" || prev === "head" || prev === "start")) {
      const f = +m[1], t = +(m[2] || m[1]);
      if (cur && prev === "head" && !cur.paras.length) cur.to = t; else { cur = { from: f, to: t, paras: [] }; blocks.push(cur); }
      prev = "head"; continue;
    }
    if (cur) { const c = clean(l); if (c) cur.paras.push(c); prev = "p"; }
  }
  return blocks;
}
export function splitAuthor(p) {
  const i = p.indexOf(": ");
  if (i > 0 && i <= 90 && !/[“"”‘]/.test(p.slice(0, i))) return [p.slice(0, i), p.slice(i + 2)];
  return ["", p];
}
export async function catenaItems(abbr, name, ch, from, to) {
  const n = CATENA[abbr]; if (!n) return null;
  const toc = await getHtml(`https://ccel.org/ccel/aquinas/catena${n}.toc.html`);
  const url = findChapterUrl(toc, ch); if (!url) throw new Error("capitol negăsit în cuprins");
  const blocks = parseChapter(await getHtml(url)), items = [];
  for (const b of blocks) {
    if (b.from > to || b.to < from) continue;
    b.paras.forEach((p, k) => {
      const [author, text] = splitAuthor(p);
      items.push({ id: `ca-${abbr}-${ch}-${b.from}-${k}`, status: "published", book: abbr, chapter: ch, verse_from: b.from, verse_to: b.to,
        source_type: "catena", title: "Catena Aurea – Toma d’Aquino", author, locator: `${name} ${ch}:${b.from}${b.to > b.from ? "-" + b.to : ""}`,
        original_lang: "en", original_text: text, romanian_translation: null, translation_status: "machine_only", source_url: url,
        license: "Domeniu public (ed. Parker, 1842), via CCEL", order: k });
    });
  }
  return items;
}
