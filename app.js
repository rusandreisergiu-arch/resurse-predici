(()=>{
const $=id=>document.getElementById(id);
const TYPES=[["catena","Catena Bible (Părinții Bisericii)"],["magisterium","Magisteriul Bisericii"],["catechism","Catehismul Bisericii Catolice"]];
const STAT={official:"traducere oficială",machine_reviewed:"traducere automată revizuită",machine_only:"traducere automată neverificată"};
let books=[],fsz=+localStorage.getItem("fs")||17;
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.\s]+/g,"");
const cur=()=>books.find(b=>b.abbr===$("book").value);
const fill=(sel,n,v)=>{sel.innerHTML="";for(let i=1;i<=n;i++)sel.add(new Option(i,i));sel.value=v};
const maxV=(b,c)=>b.verses?b.verses[c-1]:176;
function setFont(){document.documentElement.style.setProperty("--fs",fsz+"px");try{localStorage.setItem("fs",fsz)}catch(e){}}
function onBook(){const b=cur();fill($("ch"),b.chapters,1);onCh()}
function setWhole(w){$("whole").checked=w;$("vf").disabled=$("vt").disabled=w}
function onCh(){const b=cur(),c=+$("ch").value,m=maxV(b,c);fill($("vf"),m,1);fill($("vt"),m,Math.min(m,5)>0?1:1);
setWhole(!b.verses);$("hint").textContent=b.verses?`${b.name} ${c} are ${m} versete.`:"Numărul exact de versete nu e încă în date pentru această carte: folosește „Tot capitolul” sau alege intervalul (1–176)."}
function fixRange(){if(+$("vt").value<+$("vf").value)$("vt").value=$("vf").value}
function parse(){const m=$("q").value.trim().match(/^(.+?)\s+(\d+)(?:\s*[:,.]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
if(!m)throw"Format neașteptat. Exemplu: Matei 1:1-5";
const k=norm(m[1]),b=books.find(x=>norm(x.name)===k||norm(x.abbr)===k||(x.al||[]).some(y=>norm(y)===k));
if(!b)throw`Cartea „${m[1]}” nu există.`;
const c=+m[2];if(c<1||c>b.chapters)throw`${b.name} are doar ${b.chapters} capitole.`;
const mx=maxV(b,c),f=m[3]?+m[3]:1,t=m[4]?+m[4]:(m[3]?f:mx),wh=!m[3];
if(!wh&&(f<1||t<f||t>mx))throw`Interval de versete invalid (${b.name} ${c} are ${mx} versete).`;
$("book").value=b.abbr;fill($("ch"),b.chapters,c);fill($("vf"),mx,wh?1:f);fill($("vt"),mx,wh?mx:t);setWhole(wh);$("hint").textContent=""}
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
function card(it){const d=el("div","card");
const h=el("div");h.append(el("span","tag",it.source_type));h.append(el("strong",null,it.title||""));d.append(h);
const mt=[it.author,it.locator].filter(Boolean).join(" · ");if(mt)d.append(el("div","meta",mt));
const tr=el("blockquote","tr");const lb=el("div","lbl");
if(it.romanian_translation){tr.textContent=it.romanian_translation;lb.textContent="Română – "+(STAT[it.translation_status]||"neverificată")}
else if(it.original_lang==="ro"){tr.textContent=it.original_text||"";lb.textContent="Română"}
else{tr.textContent="Se traduce…";tr.className="tr pending";lb.textContent="Română – traducere automată neverificată"}
d.append(lb,tr);it._el=tr;it._lb=lb;
if(it.original_text&&it.original_lang!=="ro"){const dt=document.createElement("details");dt.append(el("summary","meta","Text original ("+(it.original_lang||"?").toUpperCase()+")"));dt.append(el("blockquote",null,it.original_text));d.append(dt)}
if(it.summary){d.append(el("div","lbl","Rezumat (nu este citat)"));d.append(el("blockquote",null,it.summary))}
const a=el("a",null,"Sursă: "+it.source_url);if(/^https:\/\//.test(it.source_url||"")){a.href=it.source_url;a.target="_blank";a.rel="noopener noreferrer"}
d.append(a);return d}
async function translateAll(items,gen){const todo=items.filter(i=>!i.romanian_translation&&i.original_lang&&i.original_lang!=="ro"&&i.original_text);
for(let k=0;k<todo.length;k+=3){if(gen!==G)return;const ch=todo.slice(k,k+3);
try{const r=await fetch("/api/translate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({texts:ch.map(i=>i.original_text)})});
const j=await r.json();if(!r.ok)throw j.error||"Eroare traducere";
ch.forEach((i,n)=>{if(gen!==G)return;i._el.textContent=j.translations[n];i._el.className="tr";i._lb.textContent="Română – traducere automată neverificată"})}
catch(e){ch.forEach(i=>{i._el.textContent="Traducerea nu este disponibilă ("+e+"). Vezi textul original mai jos.";i._el.className="tr empty"});return}}}
let G=0;
async function search(){const gen=++G;$("err").hidden=true;const b=cur(),c=+$("ch").value,wh=$("whole").checked,f=wh?1:+$("vf").value,t=wh?maxV(b,c):+$("vt").value,out=$("out");
out.replaceChildren(el("p","meta","Se caută sursele…"));
try{const r=await fetch(`/api/explanations?book=${encodeURIComponent(b.abbr)}&chapter=${c}&from=${f}&to=${t}${wh?"&whole=1":""}`);
const j=await r.json();if(!r.ok)throw j.error||"Eroare";if(gen!==G)return;
out.replaceChildren(el("h2",null,wh?`${b.name} ${c} (tot capitolul)`:`${b.name} ${c}:${f}${t>f?"-"+t:""}`));
(j.notices||[]).forEach(n=>out.append(el("p","meta",n)));
let any=false;
for(let v=f;v<=t;v++){const mine=j.items.filter(i=>Math.max(i.verse_from,f)===v);if(!mine.length)continue;any=true;
out.append(el("h2",null,"Versetul "+v+(mine.some(i=>i.verse_to>v)?" (și următoarele)":"")));
for(const [k,l] of TYPES){const g=mine.filter(i=>i.source_type===k);if(!g.length)continue;out.append(el("h3",null,l));g.forEach(i=>out.append(card(i)))}}
if(!any)out.append(el("p","empty","Nu a fost găsită o explicație verificată."));
translateAll(j.items,gen)}
catch(e){out.replaceChildren();$("err").textContent=navigator.onLine?String(e):"Ești offline. Căutarea necesită conexiune.";$("err").hidden=false}}
async function init(){
try{books=await (await fetch("/data/books.json")).json()}catch(e){$("err").textContent="Nu pot încărca lista cărților.";$("err").hidden=false;return}
for(const [t,l] of [["VT","Vechiul Testament"],["NT","Noul Testament"]]){const g=document.createElement("optgroup");g.label=l;books.filter(b=>b.testament===t).forEach(b=>g.append(new Option(b.name,b.abbr)));$("book").append(g)}
$("book").value="Mt";onBook();setFont();
$("book").onchange=onBook;$("ch").onchange=onCh;$("vf").onchange=fixRange;$("whole").onchange=()=>setWhole($("whole").checked);$("vt").onchange=()=>{if(+$("vt").value<+$("vf").value)$("vf").value=$("vt").value};
$("f").onsubmit=e=>{e.preventDefault();try{if($("q").value.trim())parse()}catch(x){$("err").textContent=x;$("err").hidden=false;return}search()};
$("reset").onclick=()=>{$("q").value="";$("book").value="Mt";onBook();$("out").replaceChildren();$("err").hidden=true};
$("fm").onclick=()=>{fsz=Math.max(14,fsz-1);setFont()};$("fp").onclick=()=>{fsz=Math.min(24,fsz+1);setFont()};
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js")}
init()})();
