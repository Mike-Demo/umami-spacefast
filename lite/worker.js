var Re=new TextEncoder;async function V(e){let t=await crypto.subtle.digest("SHA-256",Re.encode(e));return[...new Uint8Array(t)].map(n=>n.toString(16).padStart(2,"0")).join("")}async function L(...e){let t=await V(e.join("|"));return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20,32)}`}function k(){let e=new Uint8Array(16);crypto.getRandomValues(e),e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[...e].map(n=>n.toString(16).padStart(2,"0")).join("");return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function u(e,t){return e==null?null:e.length>t?e.slice(0,t):e}function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function z(e){return typeof e=="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e)}var _e=/bot|crawl|spider|slurp|mediapartners|baidu|yandex|sohu|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claudebot|ccbot|anthropic|applebot|bingpreview|duckduckbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora|pinterest|redditbot|tumblr|twitterbot|facebookexternalhit/i;function G(e){return!!e&&_e.test(e)}function q(e){return e.headers.get("cf-connecting-ip")||e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"0.0.0.0"}function J(e){if(!e)return{browser:null,os:null,device:null};let t=e.toLowerCase(),n=null;t.includes("edg/")?n="edge":t.includes("opr/")||t.includes("opera")?n="opera":t.includes("firefox")?n="firefox":t.includes("chrome")?n="chrome":t.includes("safari")&&(n="safari");let r=null;t.includes("windows")?r="windows":t.includes("mac os")?r="mac":t.includes("android")?r="android":t.includes("iphone")||t.includes("ipad")?r="ios":t.includes("linux")&&(r="linux");let s=null;return t.includes("mobile")||t.includes("iphone")||t.includes("android")?s="mobile":t.includes("tablet")||t.includes("ipad")?s="tablet":s="desktop",{browser:n,os:r,device:s}}function H(e){return`${e.getUTCFullYear()}-${M(e.getUTCMonth()+1)}-${M(e.getUTCDate())}`}function Z(e){return`${H(e)}T${M(e.getUTCHours())}`}function M(e){return String(e).padStart(2,"0")}var j=new TextEncoder,Q="lite_session",X=168*3600;async function ee(e,t){let n=await crypto.subtle.importKey("raw",j.encode(e),{name:"HMAC",hash:"SHA-256"},!1,["sign"]),r=await crypto.subtle.sign("HMAC",n,j.encode(t));return[...new Uint8Array(r)].map(s=>s.toString(16).padStart(2,"0")).join("")}async function De(e,t){let n=new Uint8Array(t.match(/../g).map(i=>parseInt(i,16))),r=await crypto.subtle.importKey("raw",j.encode(e),"PBKDF2",!1,["deriveBits"]),s=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:n,iterations:1e5},r,256);return[...new Uint8Array(s)].map(i=>i.toString(16).padStart(2,"0")).join("")}function te(e,t){if(e.length!==t.length)return!1;let n=0;for(let r=0;r<e.length;r++)n|=e.charCodeAt(r)^t.charCodeAt(r);return n===0}function C(e){return!!(e.ADMIN_PASSWORD_HASH&&e.ADMIN_SALT&&e.ADMIN_SECRET)}async function ne(e,t){if(!C(e))return!1;let n=await De(t,e.ADMIN_SALT);return te(n,e.ADMIN_PASSWORD_HASH)}async function re(e){let t=Math.floor(Date.now()/1e3)+X,n=await ee(e.ADMIN_SECRET,String(t));return`${t}.${n}`}async function W(e,t){if(!C(e))return!1;let n=/(?:^|;\s*)lite_session=([^;]+)/.exec(t??"");if(!n)return!1;let[r,s]=decodeURIComponent(n[1]).split("."),i=parseInt(r,10);if(!r||!s||Number.isNaN(i)||i<Math.floor(Date.now()/1e3))return!1;let m=await ee(e.ADMIN_SECRET,r);return te(s,m)}function se(e){return`${Q}=${encodeURIComponent(e)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${X}; Secure`}function ie(){return`${Q}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`}function E(e,t=2){return String(e).padStart(t,"0")}function Ae(e){return e===void 0||e===null?null:typeof e=="boolean"?e?1:0:e instanceof Date?`${E(e.getUTCFullYear(),4)}-${E(e.getUTCMonth()+1)}-${E(e.getUTCDate())} ${E(e.getUTCHours())}:${E(e.getUTCMinutes())}:${E(e.getUTCSeconds())}`:e}function P(e,t,...n){let r=n.map(Ae);return e.prepare(t).bind(...r)}async function b(e,t,...n){return(await P(e,t,...n).all()).results??[]}async function R(e,t,...n){return await P(e,t,...n).first()??null}async function h(e,t,...n){await P(e,t,...n).run()}var ae=/token|password|passwd|secret|api[_-]?key|auth|session|email|e-mail/i,oe=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;function ce(e){if(!e)return null;let t=new URLSearchParams(e),n=[];for(let[r,s]of t)ae.test(r)||n.push([r,oe.test(s)?"[redacted]":s]);return n.length?n.map(([r,s])=>`${encodeURIComponent(r)}=${encodeURIComponent(s)}`).join("&"):null}function Te(e,t){let n=t?`https://${t}`:"https://localhost";try{let r=new URL(e??"/",n);return{path:u(r.pathname==="/undefined"?"":r.pathname+r.hash,500)??"",query:ce(r.search?r.search.slice(1):null),utmSource:u(r.searchParams.get("utm_source"),255),utmMedium:u(r.searchParams.get("utm_medium"),255),utmCampaign:u(r.searchParams.get("utm_campaign"),255),utmContent:u(r.searchParams.get("utm_content"),255),utmTerm:u(r.searchParams.get("utm_term"),255)}}catch{return{path:"/",query:null,utmSource:null,utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null}}}function Ne(e,t){if(!e)return{domain:null,path:null,query:null};try{let n=t?`https://${t}`:"https://localhost",r=new URL(e,n),s=(t??"").replace(/^www\./,""),i=r.hostname.replace(/^www\./,"");return{domain:i&&i!==s?u(i,500):null,path:u(r.pathname+r.hash,500),query:ce(r.search?r.search.slice(1):null)}}catch{return{domain:null,path:null,query:null}}}async function de(e,t){let n;try{n=await e.json()}catch{return Response.json({error:"invalid json"},{status:400})}let{type:r,payload:s}=n??{};if(r!=="event"||!s||typeof s!="object")return Response.json({ok:!0});let i=s.website;if(!z(i))return Response.json({error:"invalid website id"},{status:400});if(!await R(t,"SELECT website_id FROM website WHERE website_id = ?",i))return Response.json({error:"website not found"},{status:400});let a=e.headers.get("user-agent");if(G(a))return Response.json({ok:!0});let c=new Date,l=s.timestamp?new Date(Math.floor(Number(s.timestamp))*1e3):c;if(Number.isNaN(l.getTime()))return Response.json({error:"invalid timestamp"},{status:400});let p=q(e),{browser:w,os:A,device:v}=J(a),S=await L(i,p,a??"",H(c),"session");await P(t,`INSERT IGNORE INTO session (session_id, website_id, browser, os, device, screen, language, country, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,S,i,w,A,v,u(s.screen,11),u(s.language,35),null,l).run();let T=await L(S,Z(c),"visit"),g=Te(s.url,s.hostname),y=Ne(s.referrer,s.hostname),o=typeof s.name=="string"?s.name:null,N=o?2:1,K=k();await h(t,`INSERT INTO website_event
      (event_id, website_id, session_id, visit_id, created_at, url_path, url_query,
       referrer_domain, referrer_path, referrer_query, page_title,
       event_type, event_name, hostname,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,K,i,S,T,l,g.path,g.query,y.domain,y.path,y.query,u(s.title,500),N,u(o,50),u(s.hostname,100),g.utmSource,g.utmMedium,g.utmCampaign,g.utmContent,g.utmTerm,u(s.tag,50));let $=s.data;if($&&typeof $=="object"&&!Array.isArray($)){let Ee=Object.keys($).slice(0,20);for(let I of Ee){let x=$[I];if(typeof x!="string"&&typeof x!="number")continue;let O=typeof x=="string"?x:null;O&&(ae.test(I)||oe.test(O))||await h(t,`INSERT INTO event_data
          (event_data_id, website_id, website_event_id, data_key, string_value, number_value, data_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,k(),i,K,u(I,500)??I,O?u(O,500):null,typeof x=="number"?x:null,typeof x=="number"?2:1,l)}}return Response.json({ok:!0})}function le(e){let t=new Date,n=new Date(t);return e==="24h"?(n.setHours(n.getHours()-24),{start:n,end:t,bucket:"hour"}):(n.setDate(n.getDate()-(e==="7d"?7:30)),{start:n,end:t,bucket:"day"})}async function ue(e,t,n,r){let s=await R(e,`SELECT
       COUNT(*) AS pageviews,
       COUNT(DISTINCT session_id) AS visitors,
       COUNT(DISTINCT visit_id) AS visits,
       SUM(CASE WHEN e.c = 1 THEN 1 ELSE 0 END) AS bounces
     FROM (
       SELECT session_id, visit_id, COUNT(*) AS c
       FROM website_event
       WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
       GROUP BY session_id, visit_id
     ) e`,t,n,r);return{pageviews:Number(s?.pageviews??0),visitors:Number(s?.visitors??0),visits:Number(s?.visits??0),bounces:Number(s?.bounces??0)}}async function pe(e,t,n,r,s){return(await b(e,`SELECT DATE_FORMAT(created_at, '${s==="hour"?"%Y-%m-%d %H:00":"%Y-%m-%d"}') AS label,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
     GROUP BY label ORDER BY label`,t,n,r)).map(a=>({label:String(a.label),pageviews:Number(a.pageviews),visitors:Number(a.visitors)}))}async function me(e,t,n,r){return b(e,`SELECT url_path AS path, MAX(page_title) AS title, COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
     GROUP BY url_path ORDER BY views DESC LIMIT 10`,t,n,r)}async function ge(e,t,n,r){return b(e,`SELECT referrer_domain AS domain, COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
       AND referrer_domain IS NOT NULL AND referrer_domain != ''
     GROUP BY referrer_domain ORDER BY views DESC LIMIT 10`,t,n,r)}async function fe(e,t,n,r){return b(e,`SELECT event_name AS name, COUNT(*) AS count,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 2
     GROUP BY event_name ORDER BY count DESC LIMIT 10`,t,n,r)}async function he(e,t){let n=new Date(Date.now()-18e5),r=await b(e,`SELECT url_path AS path, page_title AS title, referrer_domain AS ref,
            created_at AS at
     FROM website_event
     WHERE website_id = ? AND created_at >= ? AND event_type = 1
     ORDER BY created_at DESC LIMIT 20`,t,n),s=await R(e,`SELECT COUNT(DISTINCT session_id) AS visitors
     FROM website_event WHERE website_id = ? AND created_at >= ? AND event_type = 1`,t,n);return{visitors:Number(s?.visitors??0),rows:r}}async function B(e){return b(e,"SELECT website_id AS id, name, domain FROM website ORDER BY name")}async function be(e,t){return R(e,"SELECT website_id AS id, name, domain FROM website WHERE website_id = ?",t)}async function we(e,t,n){let r=k();return await h(e,"INSERT INTO website (website_id, name, domain, created_at) VALUES (?, ?, ?, ?)",r,t,n,new Date),r}var $e=`
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;background:#f6f6f4;color:#1a1a1a;line-height:1.45}
@media(prefers-color-scheme:dark){body{background:#141412;color:#e8e8e4}}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px}
header.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
header.top h1{font-size:20px;margin:0}
nav a{margin-right:12px;color:inherit;text-decoration:none;border-bottom:2px solid transparent}
nav a.on{border-color:#7c5cff}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.card{background:#fff;border:1px solid #e4e4e0;border-radius:10px;padding:14px}
@media(prefers-color-scheme:dark){.card{background:#1d1d1a;border-color:#33332e}}
.card .v{font-size:26px;font-weight:700}
.card .l{font-size:12px;opacity:.65;text-transform:uppercase;letter-spacing:.04em}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:700px){.grid2{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e4e4e0}
@media(prefers-color-scheme:dark){th,td{border-color:#33332e}}
th{font-size:12px;opacity:.65;text-transform:uppercase;letter-spacing:.04em}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.panel{background:#fff;border:1px solid #e4e4e0;border-radius:10px;padding:14px;margin:12px 0;overflow-x:auto}
@media(prefers-color-scheme:dark){.panel{background:#1d1d1a;border-color:#33332e}}
.panel h2{font-size:15px;margin:0 0 8px}
form.inline{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input,select,button{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid #d4d4d0}
button{background:#1a1a1a;color:#fff;border-color:#1a1a1a;cursor:pointer}
@media(prefers-color-scheme:dark){button{background:#e8e8e4;color:#141412;border-color:#e8e8e4}}
.muted{opacity:.6;font-size:13px}
.err{background:#fde8e8;color:#a11;border:1px solid #f3b6b6;border-radius:8px;padding:10px;margin:12px 0}
code{background:#eee;padding:2px 6px;border-radius:6px;font-size:13px}
@media(prefers-color-scheme:dark){code{background:#2a2a26}}
.snippet{background:#1d1d1a;color:#e8e8e4;border-radius:10px;padding:14px;overflow-x:auto;font-size:13px;margin:12px 0}
.range{display:flex;gap:6px}
.range a{padding:6px 10px;border:1px solid #d4d4d0;border-radius:8px;text-decoration:none;color:inherit;font-size:13px}
.range a.on{background:#1a1a1a;color:#fff;border-color:#1a1a1a}
`;function U(e,t,n=""){return`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${d(e)} \xB7 Lite Analytics</title>
<style>${$e}</style></head>
<body><div class="wrap">
<header class="top"><h1>Lite Analytics</h1><nav>${n}</nav></header>
${t}</div></body></html>`}function f(e){return e.toLocaleString("en-US")}function ke(e){if(!e.length)return'<p class="muted">No data yet.</p>';let t=720,n=180,r=8,s=Math.max(...e.map(c=>c.pageviews),1),i=e.length,m=Math.max(2,(t-r*2)/i-3),a="";return e.forEach((c,l)=>{let p=Math.max(2,(n-30)*c.pageviews/s),w=r+l*((t-r*2)/i);a+=`<rect x="${w.toFixed(1)}" y="${(n-20-p).toFixed(1)}" width="${m.toFixed(1)}" height="${p.toFixed(1)}" rx="2" fill="#7c5cff"><title>${d(c.label)}: ${c.pageviews} views, ${c.visitors} visitors</title></rect>`}),`<svg viewBox="0 0 ${t} ${n}" width="100%" role="img" aria-label="Pageviews chart">${a}
<text x="${r}" y="${n-4}" font-size="10" opacity=".6">${d(e[0].label.slice(5))}</text>
<text x="${t-r-60}" y="${n-4}" font-size="10" opacity=".6">${d(e[i-1].label.slice(5))}</text></svg>`}function F(e){return U("Sign in",`<div class="panel" style="max-width:380px"><h2>Sign in</h2>
    ${e?`<div class="err">${d(e)}</div>`:""}
    <form method="post" action="/login">
      <p><input type="password" name="password" placeholder="Admin password" autocomplete="current-password" required style="width:100%"></p>
      <p><button type="submit" style="width:100%">Sign in</button></p>
    </form></div>`)}function Y(){return U("Setup needed",`<div class="panel"><h2>Admin login not configured</h2>
    <p>Set the <code>ADMIN_PASSWORD_HASH</code>, <code>ADMIN_SALT</code> and <code>ADMIN_SECRET</code>
    environment variables on the space, then redeploy. See README for how to generate them.</p></div>`)}function ve(e){let t=e.length===0?'<p class="muted">No websites yet. Add one below to get a tracking ID.</p>':`<table><tr><th>Name</th><th>Domain</th><th></th></tr>${e.map(n=>`<tr><td>${d(n.name)}</td><td>${d(n.domain)}</td><td><a href="/w/${d(n.id)}">Open</a></td></tr>`).join("")}</table>`;return U("Websites",`<div class="panel"><h2>Websites</h2>${t}</div>
    <div class="panel"><h2>Add website</h2>
      <form method="post" action="/api/websites" class="inline">
        <input name="name" placeholder="Name" required maxlength="100">
        <input name="domain" placeholder="example.com" maxlength="500">
        <button type="submit">Add</button>
      </form></div>
    <p><a href="/logout">Sign out</a></p>`,'<a href="/" class="on">Websites</a>')}function Se(e){let{website:t,websites:n,range:r,baseUrl:s,stats:i,series:m,pages:a,referrers:c,events:l,realtime:p}=e,w=i.visits>0?`${Math.round(i.bounces/i.visits*100)}%`:"\u2014",A=n.map(o=>`<option value="${d(o.id)}"${o.id===t.id?" selected":""}>${d(o.name)}</option>`).join(""),v=(o,N)=>`<a href="/w/${d(t.id)}?range=${o}" class="${r===o?"on":""}">${N}</a>`,S=a.length===0?'<tr><td colspan="3" class="muted">No pageviews yet.</td></tr>':a.map(o=>`<tr><td>${d(o.title||o.path)}</td><td class="muted">${d(o.path)}</td><td class="n">${f(Number(o.views))}</td><td class="n">${f(Number(o.visitors))}</td></tr>`).join(""),T=c.length===0?'<tr><td colspan="3" class="muted">No referrers yet.</td></tr>':c.map(o=>`<tr><td>${d(o.domain)}</td><td class="n">${f(Number(o.views))}</td><td class="n">${f(Number(o.visitors))}</td></tr>`).join(""),g=l.length===0?'<tr><td colspan="3" class="muted">No custom events yet.</td></tr>':l.map(o=>`<tr><td>${d(o.name)}</td><td class="n">${f(Number(o.count))}</td><td class="n">${f(Number(o.visitors))}</td></tr>`).join(""),y=p.rows.length===0?'<tr><td colspan="3" class="muted">No visits in the last 30 minutes.</td></tr>':p.rows.map(o=>`<tr><td>${d(o.title||o.path)}</td><td class="muted">${d(o.ref||"direct")}</td><td class="muted">${d(String(o.at).slice(11,19))}</td></tr>`).join("");return U(t.name,`<form class="inline" style="margin-bottom:12px" onchange="location='/w/'+this.site.value+'?range=${r}'">
       <select name="site">${A}</select>
       <span class="range">${v("24h","24H")}${v("7d","7D")}${v("30d","30D")}</span>
     </form>
     <div class="cards">
       <div class="card"><div class="v">${f(i.pageviews)}</div><div class="l">Pageviews</div></div>
       <div class="card"><div class="v">${f(i.visitors)}</div><div class="l">Visitors</div></div>
       <div class="card"><div class="v">${f(i.visits)}</div><div class="l">Visits</div></div>
       <div class="card"><div class="v">${w}</div><div class="l">Bounce rate</div></div>
       <div class="card"><div class="v">${f(p.visitors)}</div><div class="l">Online now</div></div>
     </div>
     <div class="panel"><h2>Traffic</h2>${ke(m)}</div>
     <div class="panel"><h2>Live \u2014 last 30 minutes</h2>
       <table><tr><th>Page</th><th>Referrer</th><th>Time</th></tr>${y}</table></div>
     <div class="grid2">
       <div class="panel"><h2>Top pages</h2>
         <table><tr><th>Page</th><th>Path</th><th class="n">Views</th><th class="n">Visitors</th></tr>${S}</table></div>
       <div class="panel"><h2>Referrers</h2>
         <table><tr><th>Domain</th><th class="n">Views</th><th class="n">Visitors</th></tr>${T}</table></div>
     </div>
     <div class="panel"><h2>Custom events</h2>
       <table><tr><th>Event</th><th class="n">Count</th><th class="n">Visitors</th></tr>${g}</table></div>
     <div class="panel"><h2>Tracking snippet</h2>
       <p class="muted">Add this to every page of <strong>${d(t.name)}</strong>:</p>
       <pre class="snippet">&lt;script defer src="${d(s)}/tracker.js" data-website-id="${d(t.id)}"&gt;&lt;/script&gt;</pre>
       <p class="muted">Custom events: <code>lite.track('signup', { plan: 'pro' })</code></p></div>
     <p><a href="/">All websites</a> \xB7 <a href="/logout">Sign out</a></p>`,'<a href="/">Websites</a>')}var ye=`(() => {
  const s = document.currentScript;
  const websiteId = s.getAttribute('data-website-id');
  if (!websiteId) return;
  const hostUrl = (s.getAttribute('data-host-url') || s.src.split('/').slice(0, -1).join('/')).replace(/\\/$/, '');
  const autoTrack = s.getAttribute('data-auto-track') !== 'false';
  const excludeSearch = s.hasAttribute('data-exclude-search');
  const domains = (s.getAttribute('data-domains') || '').split(',').map(d => d.trim()).filter(Boolean);
  const endpoint = hostUrl + '/api/send';
  const trackUrl = s.getAttribute('data-track-url');

  if (domains.length && !domains.includes(location.hostname)) return;
  if (navigator.doNotTrack === '1') return;

  const getPayload = () => ({
    website: websiteId,
    hostname: location.hostname,
    language: (navigator.language || '').toLowerCase(),
    referrer: document.referrer || undefined,
    screen: window.screen.width + 'x' + window.screen.height,
    title: document.title,
    url: trackUrl || (excludeSearch ? location.pathname + location.hash : location.href),
  });

  let lastUrl = null;
  const send = (payload, type) => {
    if (lastUrl === payload.url && !payload.name) return;
    lastUrl = payload.url;
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type || 'event', payload }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) { /* noop */ }
  };

  const trackPageview = () => send(getPayload());
  const trackEvent = (name, data) => {
    if (typeof name !== 'string') return;
    send({ ...getPayload(), name, data });
  };

  window.lite = window.lite || {};
  window.lite.track = trackEvent;

  if (autoTrack) {
    if (document.readyState === 'complete') trackPageview();
    else window.addEventListener('load', trackPageview);
    const origPush = history.pushState, origReplace = history.replaceState;
    const onNav = () => setTimeout(trackPageview, 50);
    history.pushState = function () { origPush.apply(this, arguments); onNav(); };
    history.replaceState = function () { origReplace.apply(this, arguments); onNav(); };
    window.addEventListener('popstate', onNav);
  }
})();
`;var xe=365;function D(e,t){let n={location:e};return t&&(n["set-cookie"]=t),new Response(null,{status:303,headers:n})}function _(e,t=200){return new Response(e,{status:t,headers:{"content-type":"text/html; charset=utf-8"}})}async function Ce(e,t){return await W(t,e.headers.get("cookie"))?null:D("/login")}var Xe={async fetch(e,t){let n=new URL(e.url),r=n.pathname,s=t.DB;if(!s||typeof s.prepare!="function")return Response.json({error:"database not available"},{status:500});if(r==="/api/send"||r==="/api/collect")return e.method!=="POST"?Response.json({error:"method not allowed"},{status:405}):de(e,s);if(r==="/tracker.js"&&e.method==="GET")return new Response(ye,{headers:{"content-type":"application/javascript; charset=utf-8","cache-control":"public, max-age=3600"}});if(r==="/api/health")return Response.json({ok:!0});if(r==="/login"){if(e.method==="GET")return await W(t,e.headers.get("cookie"))?D("/"):_(C(t)?F():Y());if(e.method==="POST"){let a=await e.formData(),c=String(a.get("password")??"");return await ne(t,c)?D("/",se(await re(t))):_(F("Wrong password."),401)}}if(r==="/logout")return D("/login",ie());let i=await Ce(e,t);if(i)return i;if(!C(t))return _(Y(),500);if(r==="/"&&e.method==="GET")return _(ve(await B(s)));if(r==="/api/websites"&&e.method==="POST"){let a=await e.formData(),c=String(a.get("name")??"").trim().slice(0,100),l=String(a.get("domain")??"").trim().slice(0,500)||null;if(!c)return D("/");let p=await we(s,c,l);return D(`/w/${p}`)}let m=/^\/w\/([0-9a-f-]{36})$/.exec(r);if(m&&e.method==="GET"){let a=await be(s,m[1]);if(!a)return _('<p>Website not found.</p><p><a href="/">Back</a></p>',404);let c=["24h","7d","30d"].includes(n.searchParams.get("range"))?n.searchParams.get("range"):"30d",{start:l,end:p,bucket:w}=le(c),A=`${n.protocol}//${n.host}`,[v,S,T,g,y,o,N]=await Promise.all([ue(s,a.id,l,p),pe(s,a.id,l,p,w),me(s,a.id,l,p),ge(s,a.id,l,p),fe(s,a.id,l,p),he(s,a.id),B(s)]);return _(Se({website:a,websites:N,range:c,baseUrl:A,stats:v,series:S,pages:T,referrers:g,events:y,realtime:o}))}if(r==="/api/admin/retention"&&e.method==="POST"){let a=Math.max(1,parseInt(n.searchParams.get("days")??String(xe),10)||xe),c=new Date(Date.now()-a*864e5);return await h(s,"DELETE FROM event_data WHERE created_at < ?",c),await h(s,"DELETE FROM website_event WHERE created_at < ?",c),await h(s,"DELETE FROM session WHERE created_at < ?",c),Response.json({ok:!0,days:a})}return new Response("Not found",{status:404})}};export{Xe as default};
