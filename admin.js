(()=>{const $=id=>document.getElementById(id);
async function call(step){const r=await fetch("/api/ccc-build",{method:"POST",headers:{"content-type":"application/json","x-admin-token":$("t").value},body:JSON.stringify({step})});
const j=await r.json();if(!r.ok)throw j.error||"Eroare";return j}
$("go").onclick=async()=>{const s=$("s");$("go").disabled=true;try{s.textContent="Se citește cuprinsul…";const a=await call(0);
for(let i=1;i<=a.steps;i++){s.textContent=`Pasul ${i} din ${a.steps}…`;const r=await call(i);if(r.done){s.textContent=`Gata. ${r.paragraphs} paragrafe indexate.`+(r.unknown&&r.unknown.length?` Abrevieri nerecunoscute: ${r.unknown.map(x=>x[0]+" ("+x[1]+")").join(", ")}`:"");break}}}
catch(e){s.textContent="Eroare: "+e}$("go").disabled=false}})();
