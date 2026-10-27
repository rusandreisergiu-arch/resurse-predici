# Resurse pentru predici – PWA pentru Cloudflare Pages

## Deploy (fără build)
1. Dashboard Cloudflare → Workers & Pages → Create → Pages → **Upload assets**.
2. Încarcă acest ZIP (sau `npx wrangler pages deploy .`). Build command: gol. Output directory: `/`.
3. Deschide URL-ul `*.pages.dev` pe telefon:
   - Android/Chrome: meniu ⋮ → „Instalează aplicația”.
   - iPhone/Safari: Partajează → „Adaugă pe ecranul principal”.

## Mod automat (v2)
La căutare, funcția `/api/explanations` preia **Catena Aurea (Toma d'Aquino)** de pe CCEL (Matei, Marcu, Luca, Ioan), o împarte pe verset și autor, iar interfața o traduce automat în română (`POST /api/translate`). Româna apare prima; originalul e într-un bloc pliabil.

### Traducere GRATUITĂ (recomandat să începi așa)
Cloudflare → proiectul Pages → Settings → Bindings → Add → **Workers AI**, nume variabilă `AI`. Fără cheie și fără abonament; plan gratuit: 10.000 „neuroni”/zi (ajunge pentru câteva zeci de versete pe zi). Calitate: model generic (m2m100), mai literal decât Claude.

### Traducere de calitate (plătită, opțională)
Cloudflare → proiectul Pages → Settings → Variables and Secrets → adaugă secretul `ANTHROPIC_API_KEY`
(opțional `TRANSLATE_MODEL`, implicit `claude-haiku-5-5`). Fără cheie, aplicația arată originalul și un mesaj.
Traducerile se păstrează în cache 30 de zile (Cache API; pe domeniu propriu, nu pe *.pages.dev).
Recomandat: Security → WAF → Rate limiting pe `/api/translate`, ca să nu ți se consume cheia.

### Verificat / neverificat
- ✔ Structura CCEL verificată pe Matei 1 și Marcu (cuprins + pagină de capitol); parserul testat pe HTML sintetic.
- ⚠ Luca și Ioan presupun `catena3` și `catena4` pe CCEL (neverificat) – testează la primul deploy.
- ⚠ Nu am putut rula funcția live aici (rețea blocată). Dacă CCEL schimbă HTML-ul, ajustează `functions/_lib/catena.js`.
- ⚠ Funcțiile Pages cer plan cu timp CPU suficient; dacă vezi eroarea 1102, treci pe planul Workers Paid.
- ✔ Catehism (ed. română, credinta-catolica.ro): structura verificată (paragrafe „2759.” + note „Cf. Mt 5-7”). Parserul testat pe HTML sintetic. Se citește live, cu link; nu se copiază în aplicație.
- ⚠ Textul CBC are drepturi rezervate (ARCB / Libreria Editrice Vaticana). Pentru uz public cere acordul ARCB (editura.arcb@gmail.com); până atunci folosește aplicația personal.
- ✘ Documente magisteriale și Catena Bible: încă manuale prin `data/explanations.json` (format mai jos).
- Comentariile Catena Aurea sunt de domeniu public; traducerile automate sunt marcate „neverificate”.

## Activare Catehism (o singură dată)
1. Cloudflare → Storage & Databases → KV → Create namespace (ex. `ccc`).
2. Proiectul Pages → Settings → Bindings → Add → KV namespace, nume variabilă `CCC`.
3. Settings → Variables and Secrets → secretul `ADMIN_TOKEN` (o parolă aleasă de tine).
4. Redeploy, apoi deschide `https://SITE-UL-TAU/admin-index.html`, introdu parola și apasă „Construiește indexul” (~1–2 min).
Indexul leagă paragrafele CBC de versetele din **toate cele 73 de cărți** (din textul paragrafului și din note). La final, pagina de administrare arată abrevierile nerecunoscute, dacă există; trimite-mi-le ca să le adaug în `data/books.json` (câmpul `al`). Nu stochează textul Catehismului, doar numere și trimiteri.

## Cărți
Canonul catolic (73 de cărți: 46 VT + 27 NT), cu nume și abrevieri românești în `data/books.json` (`al` = alias-uri la căutare: „Facerea”, „Isus Sirah”, „Qohelet” etc.). Poți scrie „Facerea 1”, „1 Cor 13”, „Ps 23” sau alege din liste; „Tot capitolul” nu cere număr de versete.
Verificat: numărul exact de versete doar la Evanghelii; la restul se acceptă 1–176. Numerotarea Psalmilor și versetele deuterocanonice urmează Catehismul românesc.
Comentarii patristice automate: doar la Evanghelii (Catena Aurea). La celelalte cărți apar trimiterile din Catehism.

## Adăugare manuală (Catehism, magisteriu etc.)
Editează `data/explanations.json` (listă de obiecte):
```json
{"id":"ccc-507","status":"published","book":"Mt","chapter":1,"verse_from":18,"verse_to":25,
 "source_type":"catechism","title":"CBC §…","author":"","locator":"§…","original_lang":"ro",
 "original_text":"…","translation_status":"official","source_url":"https://www.vatican.va/…","order":1}
```
`source_type`: `catena` | `magisterium` | `catechism`. Limba `ro` nu se mai traduce.
