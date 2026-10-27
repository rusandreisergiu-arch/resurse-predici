const C="surse-v1",SHELL=["/","/index.html","/styles.css","/app.js","/data/books.json","/offline.html","/icons/icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(r.method!=="GET"||u.origin!==location.origin)return;
if(u.pathname.startsWith("/api/")){e.respondWith(fetch(r).catch(()=>new Response(JSON.stringify({error:"Offline"}),{status:503,headers:{"content-type":"application/json"}})));return}
e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("/offline.html"))))});
