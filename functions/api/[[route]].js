import { catenaItems } from "../_lib/catena.js";
import { cbcItems, buildStep } from "../_lib/cbc.js";
const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...h } });
const err = (m, s) => J({ error: m }, s);
const int = v => /^\d{1,4}$/.test(v || "") ? +v : NaN;
const load = async (env, req, p) => { const r = await env.ASSETS.fetch(new URL(p, req.url)); if (!r.ok) throw new Error("data"); return r.json(); };
const sha = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");

// Gratuit: Workers AI (m2m100) – împarte pe propoziții, max ~400 caractere/bucată
async function cfTranslate(env, text) {
  const parts = []; let cur = "";
  for (const s of text.split(/(?<=[.;:?!])\s+/)) { if ((cur + " " + s).length > 400 && cur) { parts.push(cur); cur = s; } else cur = cur ? cur + " " + s : s; }
  if (cur) parts.push(cur);
  const res = [];
  for (const p of parts) { const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text: p.slice(0, 900), source_lang: "english", target_lang: "romanian" }); res.push(r.translated_text || ""); }
  return res.join(" ");
}
async function translate(env, request, texts) {
  if (!env.ANTHROPIC_API_KEY && !env.AI) return { error: "Traducerea automată nu este configurată (adaugă bindingul AI sau ANTHROPIC_API_KEY).", status: 503 };
  const cache = caches.default, keys = await Promise.all(texts.map(async t => new Request("https://cache.invalid/t/" + await sha(t))));
  const out = new Array(texts.length).fill(null), miss = [];
  for (let i = 0; i < texts.length; i++) { const h = await cache.match(keys[i]); if (h) out[i] = await h.text(); else miss.push(i); }
  if (miss.length) {
    let arr;
    if (env.ANTHROPIC_API_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: env.TRANSLATE_MODEL || "claude-haiku-5-5", max_tokens: 8000,
          system: "Ești traducător de texte teologice catolice din engleză în română. Traduci fidel comentarii patristice: fără adăugiri, fără explicații, fără rezumat. Păstrează citatele biblice între ghilimele și numele Părinților Bisericii în forma românească uzuală. Răspunzi EXCLUSIV cu un array JSON de șiruri, în aceeași ordine ca intrarea.",
          messages: [{ role: "user", content: JSON.stringify(miss.map(i => texts[i])) }] }) });
      if (!r.ok) return { error: "Serviciul de traducere a răspuns cu eroare " + r.status, status: 502 };
      const d = await r.json();
      try { arr = JSON.parse(d.content.map(c => c.text || "").join("").replace(/```json|```/g, "").trim()); } catch { return { error: "Traducere invalidă", status: 502 }; }
    } else {
      try { arr = []; for (const i of miss) arr.push(await cfTranslate(env, texts[i])); }
      catch (e) { return { error: "Limita zilnică gratuită Workers AI poate fi atinsă (" + (e.message || e) + ")", status: 429 }; }
    }
    if (!Array.isArray(arr) || arr.length !== miss.length) return { error: "Traducere incompletă", status: 502 };
    for (let k = 0; k < miss.length; k++) { out[miss[k]] = String(arr[k]); await cache.put(keys[miss[k]], new Response(out[miss[k]], { headers: { "cache-control": "public, max-age=2592000" } })); }
  }
  return { translations: out };
}

export async function onRequest({ request, env, params }) {
  try {
    const url = new URL(request.url), route = (params.route || []).join("/"), q = url.searchParams;
    if (request.method === "POST" && route === "translate") {
      const o = request.headers.get("origin"); if (o && new URL(o).host !== url.host) return err("Origine nepermisă", 403);
      const b = await request.json().catch(() => null), t = b && b.texts;
      if (!Array.isArray(t) || !t.length || t.length > 12 || t.some(x => typeof x !== "string" || !x || x.length > 6000)) return err("Cerere invalidă", 400);
      const r = await translate(env, request, t); return r.error ? err(r.error, r.status) : J(r);
    }
    if (request.method === "POST" && route === "ccc-build") {
      if (!env.ADMIN_TOKEN || request.headers.get("x-admin-token") !== env.ADMIN_TOKEN) return err("Neautorizat", 401);
      if (!env.CCC) return err("Lipsește bindingul KV „CCC”", 500);
      const b = await request.json().catch(() => ({})), s = int(String(b.step));
      if (isNaN(s)) return err("Pas invalid", 400);
      return J(await buildStep(env, s, await load(env, request, "/data/books.json")));
    }
    if (request.method !== "GET") return err("Metodă nepermisă", 405);
    const books = await load(env, request, "/data/books.json");
    if (route === "books") return J({ books });
    if (!["chapters", "verses", "explanations"].includes(route)) return err("Endpoint inexistent", 404);
    const b = books.find(x => x.abbr === q.get("book")); if (!b) return err("Carte inexistentă", 404);
    if (route === "chapters") return J({ book: b.abbr, chapters: b.chapters });
    const c = int(q.get("chapter")); if (!(c >= 1 && c <= b.chapters)) return err("Capitol invalid", 400);
    const mx = b.verses ? b.verses[c - 1] : 176;
    if (route === "verses") return J({ book: b.abbr, chapter: c, verses: mx, exact: !!b.verses });
    const whole = q.get("whole") === "1";
    const f = whole ? 1 : int(q.get("from")), t = whole ? (b.verses ? mx : 999) : int(q.get("to"));
    if (!(f >= 1 && t >= f && (whole || t <= mx))) return err("Interval de versete invalid", 400);
    const notices = []; let items = [];
    try { const ca = await catenaItems(b.abbr, b.name, c, f, t); if (ca) items = ca; else notices.push("Comentarii patristice automate: doar la Evanghelii (Catena Aurea). Pentru această carte apar trimiterile din Catehism."); }
    catch (e) { notices.push("Catena Aurea nu a putut fi încărcată acum (" + e.message + ")."); }
    try { const cb = await cbcItems(env, b.abbr, c, f, t, whole || (f === 1 && t === mx)); if (cb.notice) notices.push(cb.notice); if (cb.truncated) notices.push("Catehism: s-au afișat primele 12 paragrafe; restrânge intervalul pentru restul."); items = items.concat(cb.items); }
    catch (e) { notices.push("Catehismul nu a putut fi încărcat acum (" + e.message + ")."); }
    const manual = await load(env, request, "/data/explanations.json").catch(() => []);
    items = items.concat(manual.filter(i => i.status === "published" && i.book === b.abbr && i.chapter === c && i.verse_from <= t && i.verse_to >= f && i.source_url));
    items.sort((a, z) => a.verse_from - z.verse_from || (a.order || 0) - (z.order || 0));
    return J({ book: b.abbr, chapter: c, from: f, to: whole ? mx : t, items, notices }, 200, { "cache-control": "public, max-age=3600" });
  } catch (e) { return err("Eroare internă", 500); }
}
