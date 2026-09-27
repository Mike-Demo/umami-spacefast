var J=[`CREATE TABLE IF NOT EXISTS website (
  website_id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(500) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,`CREATE TABLE IF NOT EXISTS session (
  session_id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  browser VARCHAR(20) NULL,
  os VARCHAR(20) NULL,
  device VARCHAR(20) NULL,
  screen VARCHAR(11) NULL,
  language VARCHAR(35) NULL,
  country CHAR(2) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_website (website_id),
  INDEX idx_session_website_created (website_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,`CREATE TABLE IF NOT EXISTS website_event (
  event_id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  visit_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  url_path VARCHAR(500) NOT NULL,
  url_query VARCHAR(500) NULL,
  referrer_domain VARCHAR(500) NULL,
  referrer_path VARCHAR(500) NULL,
  referrer_query VARCHAR(500) NULL,
  page_title VARCHAR(500) NULL,
  event_type INT NOT NULL DEFAULT 1,
  event_name VARCHAR(50) NULL,
  hostname VARCHAR(100) NULL,
  utm_source VARCHAR(255) NULL,
  utm_medium VARCHAR(255) NULL,
  utm_campaign VARCHAR(255) NULL,
  utm_content VARCHAR(255) NULL,
  utm_term VARCHAR(255) NULL,
  tag VARCHAR(50) NULL,
  INDEX idx_event_website (website_id),
  INDEX idx_event_website_created (website_id, created_at),
  INDEX idx_event_website_created_path (website_id, created_at, url_path),
  INDEX idx_event_website_created_ref (website_id, created_at, referrer_domain),
  INDEX idx_event_website_created_name (website_id, created_at, event_name),
  INDEX idx_event_session (website_id, session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,`CREATE TABLE IF NOT EXISTS event_data (
  event_data_id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  website_event_id CHAR(36) NOT NULL,
  data_key VARCHAR(500) NOT NULL,
  string_value VARCHAR(500) NULL,
  number_value DECIMAL(19,4) NULL,
  data_type INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_edata_event (website_event_id),
  INDEX idx_edata_website_created_key (website_id, created_at, data_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`];var De=new TextEncoder;async function Z(e){let t=await crypto.subtle.digest("SHA-256",De.encode(e));return[...new Uint8Array(t)].map(n=>n.toString(16).padStart(2,"0")).join("")}async function B(...e){let t=await Z(e.join("|"));return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20,32)}`}function I(){let e=new Uint8Array(16);crypto.getRandomValues(e),e[6]=e[6]&15|64,e[8]=e[8]&63|128;let t=[...e].map(n=>n.toString(16).padStart(2,"0")).join("");return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function p(e,t){return e==null?null:e.length>t?e.slice(0,t):e}function l(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Q(e){return typeof e=="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e)}var Ce=/bot|crawl|spider|slurp|mediapartners|baidu|yandex|sohu|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claudebot|ccbot|anthropic|applebot|bingpreview|duckduckbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora|pinterest|redditbot|tumblr|twitterbot|facebookexternalhit/i;function ee(e){return!!e&&Ce.test(e)}function te(e){return e.headers.get("cf-connecting-ip")||e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"0.0.0.0"}function ne(e){if(!e)return{browser:null,os:null,device:null};let t=e.toLowerCase(),n=null;t.includes("edg/")?n="edge":t.includes("opr/")||t.includes("opera")?n="opera":t.includes("firefox")?n="firefox":t.includes("chrome")?n="chrome":t.includes("safari")&&(n="safari");let s=null;t.includes("windows")?s="windows":t.includes("mac os")?s="mac":t.includes("android")?s="android":t.includes("iphone")||t.includes("ipad")?s="ios":t.includes("linux")&&(s="linux");let r=null;return t.includes("mobile")||t.includes("iphone")||t.includes("android")?r="mobile":t.includes("tablet")||t.includes("ipad")?r="tablet":r="desktop",{browser:n,os:s,device:r}}function V(e){return`${e.getUTCFullYear()}-${F(e.getUTCMonth()+1)}-${F(e.getUTCDate())}`}function se(e){return`${V(e)}T${F(e.getUTCHours())}`}function F(e){return String(e).padStart(2,"0")}var W=new TextEncoder,re="lite_session",ie=168*3600;async function ae(e,t){let n=await crypto.subtle.importKey("raw",W.encode(e),{name:"HMAC",hash:"SHA-256"},!1,["sign"]),s=await crypto.subtle.sign("HMAC",n,W.encode(t));return[...new Uint8Array(s)].map(r=>r.toString(16).padStart(2,"0")).join("")}async function Le(e,t){let n=new Uint8Array(t.match(/../g).map(o=>parseInt(o,16))),s=await crypto.subtle.importKey("raw",W.encode(e),"PBKDF2",!1,["deriveBits"]),r=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:n,iterations:1e5},s,256);return[...new Uint8Array(r)].map(o=>o.toString(16).padStart(2,"0")).join("")}function $(e,t){if(e.length!==t.length)return!1;let n=0;for(let s=0;s<e.length;s++)n|=e.charCodeAt(s)^t.charCodeAt(s);return n===0}function k(e){return!!(e.ADMIN_PASSWORD_HASH&&e.ADMIN_SALT&&e.ADMIN_SECRET)}async function oe(e,t){if(!k(e))return!1;let n=await Le(t,e.ADMIN_SALT);return $(n,e.ADMIN_PASSWORD_HASH)}async function ce(e){let t=Math.floor(Date.now()/1e3)+ie,n=await ae(e.ADMIN_SECRET,String(t));return`${t}.${n}`}function Y(e){let t=e.headers.get("cookie"),n=/(?:^|;\s*)lite_session=([^;]+)/.exec(t??"");if(n)return decodeURIComponent(n[1]);try{return new URL(e.url).searchParams.get("s")||null}catch{return null}}async function K(e,t){if(!k(e)||!t)return!1;let[n,s]=t.split("."),r=parseInt(n,10);if(!n||!s||Number.isNaN(r)||r<Math.floor(Date.now()/1e3))return!1;let o=await ae(e.ADMIN_SECRET,n);return $(s,o)}function de(e){return`${re}=${encodeURIComponent(e)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ie}; Secure`}function le(){return`${re}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`}function N(e,t=2){return String(e).padStart(t,"0")}function Ue(e){return e===void 0||e===null?null:typeof e=="boolean"?e?1:0:e instanceof Date?`${N(e.getUTCFullYear(),4)}-${N(e.getUTCMonth()+1)}-${N(e.getUTCDate())} ${N(e.getUTCHours())}:${N(e.getUTCMinutes())}:${N(e.getUTCSeconds())}`:e}function P(e,t,...n){let s=n.map(Ue);return e.prepare(t).bind(...s)}async function _(e,t,...n){return(await P(e,t,...n).all()).results??[]}async function T(e,t,...n){return await P(e,t,...n).first()??null}async function R(e,t,...n){await P(e,t,...n).run()}var ue=/token|password|passwd|secret|api[_-]?key|auth|session|email|e-mail/i,pe=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;function me(e){if(!e)return null;let t=new URLSearchParams(e),n=[];for(let[s,r]of t)ue.test(s)||n.push([s,pe.test(r)?"[redacted]":r]);return n.length?n.map(([s,r])=>`${encodeURIComponent(s)}=${encodeURIComponent(r)}`).join("&"):null}function Ie(e,t){let n=t?`https://${t}`:"https://localhost";try{let s=new URL(e??"/",n);return{path:p(s.pathname==="/undefined"?"":s.pathname+s.hash,500)??"",query:me(s.search?s.search.slice(1):null),utmSource:p(s.searchParams.get("utm_source"),255),utmMedium:p(s.searchParams.get("utm_medium"),255),utmCampaign:p(s.searchParams.get("utm_campaign"),255),utmContent:p(s.searchParams.get("utm_content"),255),utmTerm:p(s.searchParams.get("utm_term"),255)}}catch{return{path:"/",query:null,utmSource:null,utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null}}}function $e(e,t){if(!e)return{domain:null,path:null,query:null};try{let n=t?`https://${t}`:"https://localhost",s=new URL(e,n),r=(t??"").replace(/^www\./,""),o=s.hostname.replace(/^www\./,"");return{domain:o&&o!==r?p(o,500):null,path:p(s.pathname+s.hash,500),query:me(s.search?s.search.slice(1):null)}}catch{return{domain:null,path:null,query:null}}}async function ge(e,t){let n;try{n=await e.json()}catch{return Response.json({error:"invalid json"},{status:400})}let{type:s,payload:r}=n??{};if(s!=="event"||!r||typeof r!="object")return Response.json({ok:!0});let o=r.website;if(!Q(o))return Response.json({error:"invalid website id"},{status:400});if(!await T(t,"SELECT website_id FROM website WHERE website_id = ?",o))return Response.json({error:"website not found"},{status:400});let u=e.headers.get("user-agent");if(ee(u))return Response.json({ok:!0});let m=new Date,i=r.timestamp?new Date(Math.floor(Number(r.timestamp))*1e3):m;if(Number.isNaN(i.getTime()))return Response.json({error:"invalid timestamp"},{status:400});let c=te(e),{browser:d,os:g,device:L}=ne(u),w=await B(o,c,u??"",V(m),"session");await P(t,`INSERT IGNORE INTO session (session_id, website_id, browser, os, device, screen, language, country, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,w,o,d,g,L,p(r.screen,11),p(r.language,35),null,i).run();let U=await B(w,se(m),"visit"),h=Ie(r.url,r.hostname),S=$e(r.referrer,r.hostname),x=typeof r.name=="string"?r.name:null,a=x?2:1,y=I();await R(t,`INSERT INTO website_event
      (event_id, website_id, session_id, visit_id, created_at, url_path, url_query,
       referrer_domain, referrer_path, referrer_query, page_title,
       event_type, event_name, hostname,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,y,o,w,U,i,h.path,h.query,S.domain,S.path,S.query,p(r.title,500),a,p(x,50),p(r.hostname,100),h.utmSource,h.utmMedium,h.utmCampaign,h.utmContent,h.utmTerm,p(r.tag,50));let v=r.data;if(v&&typeof v=="object"&&!Array.isArray(v)){let Te=Object.keys(v).slice(0,20);for(let O of Te){let E=v[O];if(typeof E!="string"&&typeof E!="number")continue;let H=typeof E=="string"?E:null;H&&(ue.test(O)||pe.test(H))||await R(t,`INSERT INTO event_data
          (event_data_id, website_id, website_event_id, data_key, string_value, number_value, data_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,I(),o,y,p(O,500)??O,H?p(H,500):null,typeof E=="number"?E:null,typeof E=="number"?2:1,i)}}return Response.json({ok:!0})}function fe(e){let t=new Date,n=new Date(t);return e==="24h"?(n.setHours(n.getHours()-24),{start:n,end:t,bucket:"hour"}):(n.setDate(n.getDate()-(e==="7d"?7:30)),{start:n,end:t,bucket:"day"})}async function he(e,t,n,s){let r=await T(e,`SELECT
       COUNT(*) AS pageviews,
       COUNT(DISTINCT session_id) AS visitors,
       COUNT(DISTINCT visit_id) AS visits,
       SUM(CASE WHEN e.c = 1 THEN 1 ELSE 0 END) AS bounces
     FROM (
       SELECT session_id, visit_id, COUNT(*) AS c
       FROM website_event
       WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
       GROUP BY session_id, visit_id
     ) e`,t,n,s);return{pageviews:Number(r?.pageviews??0),visitors:Number(r?.visitors??0),visits:Number(r?.visits??0),bounces:Number(r?.bounces??0)}}async function be(e,t,n,s,r){return(await _(e,`SELECT DATE_FORMAT(created_at, '${r==="hour"?"%Y-%m-%d %H:00":"%Y-%m-%d"}') AS label,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
     GROUP BY label ORDER BY label`,t,n,s)).map(u=>({label:String(u.label),pageviews:Number(u.pageviews),visitors:Number(u.visitors)}))}async function we(e,t,n,s){return _(e,`SELECT url_path AS path, MAX(page_title) AS title, COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
     GROUP BY url_path ORDER BY views DESC LIMIT 10`,t,n,s)}async function Re(e,t,n,s){return _(e,`SELECT referrer_domain AS domain, COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
       AND referrer_domain IS NOT NULL AND referrer_domain != ''
     GROUP BY referrer_domain ORDER BY views DESC LIMIT 10`,t,n,s)}async function _e(e,t,n,s){return _(e,`SELECT event_name AS name, COUNT(*) AS count,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 2
     GROUP BY event_name ORDER BY count DESC LIMIT 10`,t,n,s)}async function Se(e,t){let n=new Date(Date.now()-18e5),s=await _(e,`SELECT url_path AS path, page_title AS title, referrer_domain AS ref,
            created_at AS at
     FROM website_event
     WHERE website_id = ? AND created_at >= ? AND event_type = 1
     ORDER BY created_at DESC LIMIT 20`,t,n),r=await T(e,`SELECT COUNT(DISTINCT session_id) AS visitors
     FROM website_event WHERE website_id = ? AND created_at >= ? AND event_type = 1`,t,n);return{visitors:Number(r?.visitors??0),rows:s}}async function G(e){return _(e,"SELECT website_id AS id, name, domain FROM website ORDER BY name")}async function ve(e,t){return T(e,"SELECT website_id AS id, name, domain FROM website WHERE website_id = ?",t)}async function Ee(e,t,n){let s=I();return await R(e,"INSERT INTO website (website_id, name, domain, created_at) VALUES (?, ?, ?, ?)",s,t,n,new Date),s}var ke=`
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
`;function M(e,t,n=""){return`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${l(e)} \xB7 Lite Analytics</title>
<style>${ke}</style></head>
<body><div class="wrap">
<header class="top"><h1>Lite Analytics</h1><nav>${n}</nav></header>
${t}</div></body></html>`}function b(e){return e.toLocaleString("en-US")}function A(e){return`s=${encodeURIComponent(e)}`}function Pe(e){if(!e.length)return'<p class="muted">No data yet.</p>';let t=720,n=180,s=8,r=Math.max(...e.map(m=>m.pageviews),1),o=e.length,f=Math.max(2,(t-s*2)/o-3),u="";return e.forEach((m,i)=>{let c=Math.max(2,(n-30)*m.pageviews/r),d=s+i*((t-s*2)/o);u+=`<rect x="${d.toFixed(1)}" y="${(n-20-c).toFixed(1)}" width="${f.toFixed(1)}" height="${c.toFixed(1)}" rx="2" fill="#7c5cff"><title>${l(m.label)}: ${m.pageviews} views, ${m.visitors} visitors</title></rect>`}),`<svg viewBox="0 0 ${t} ${n}" width="100%" role="img" aria-label="Pageviews chart">${u}
<text x="${s}" y="${n-4}" font-size="10" opacity=".6">${l(e[0].label.slice(5))}</text>
<text x="${t-s-60}" y="${n-4}" font-size="10" opacity=".6">${l(e[o-1].label.slice(5))}</text></svg>`}function X(e){return M("Sign in",`<div class="panel" style="max-width:380px"><h2>Sign in</h2>
    ${e?`<div class="err">${l(e)}</div>`:""}
    <form method="post" action="/login">
      <p><input type="password" name="password" placeholder="Admin password" autocomplete="current-password" required style="width:100%"></p>
      <p><button type="submit" style="width:100%">Sign in</button></p>
    </form></div>`)}function z(){return M("Setup needed",`<div class="panel"><h2>Admin login not configured</h2>
    <p>Set the <code>ADMIN_PASSWORD_HASH</code>, <code>ADMIN_SALT</code> and <code>ADMIN_SECRET</code>
    environment variables on the space, then redeploy. See README for how to generate them.</p></div>`)}function Ae(e,t){let n=e.length===0?'<p class="muted">No websites yet. Add one below to get a tracking ID.</p>':`<table><tr><th>Name</th><th>Domain</th><th></th></tr>${e.map(s=>`<tr><td>${l(s.name)}</td><td>${l(s.domain)}</td><td><a href="/w/${l(s.id)}?${A(t)}">Open</a></td></tr>`).join("")}</table>`;return M("Websites",`<div class="panel"><h2>Websites</h2>${n}</div>
    <div class="panel"><h2>Add website</h2>
      <form method="post" action="/api/websites?${A(t)}" class="inline">
        <input name="name" placeholder="Name" required maxlength="100">
        <input name="domain" placeholder="example.com" maxlength="500">
        <button type="submit">Add</button>
      </form></div>
    <p><a href="/logout">Sign out</a></p>`,`<a href="/?${A(t)}" class="on">Websites</a>`)}function xe(e,t){let{website:n,websites:s,range:r,baseUrl:o,stats:f,series:u,pages:m,referrers:i,events:c,realtime:d}=e,g=f.visits>0?`${Math.round(f.bounces/f.visits*100)}%`:"\u2014",L=s.map(a=>`<option value="${l(a.id)}"${a.id===n.id?" selected":""}>${l(a.name)}</option>`).join(""),w=(a,y)=>`<a href="/w/${l(n.id)}?range=${a}&${A(t)}" class="${r===a?"on":""}">${y}</a>`,U=m.length===0?'<tr><td colspan="3" class="muted">No pageviews yet.</td></tr>':m.map(a=>`<tr><td>${l(a.title||a.path)}</td><td class="muted">${l(a.path)}</td><td class="n">${b(Number(a.views))}</td><td class="n">${b(Number(a.visitors))}</td></tr>`).join(""),h=i.length===0?'<tr><td colspan="3" class="muted">No referrers yet.</td></tr>':i.map(a=>`<tr><td>${l(a.domain)}</td><td class="n">${b(Number(a.views))}</td><td class="n">${b(Number(a.visitors))}</td></tr>`).join(""),S=c.length===0?'<tr><td colspan="3" class="muted">No custom events yet.</td></tr>':c.map(a=>`<tr><td>${l(a.name)}</td><td class="n">${b(Number(a.count))}</td><td class="n">${b(Number(a.visitors))}</td></tr>`).join(""),x=d.rows.length===0?'<tr><td colspan="3" class="muted">No visits in the last 30 minutes.</td></tr>':d.rows.map(a=>`<tr><td>${l(a.title||a.path)}</td><td class="muted">${l(a.ref||"direct")}</td><td class="muted">${l(String(a.at).slice(11,19))}</td></tr>`).join("");return M(n.name,`<form class="inline" style="margin-bottom:12px" onchange="location='/w/'+this.site.value+'?range=${r}&${A(t)}'">
       <select name="site">${L}</select>
       <span class="range">${w("24h","24H")}${w("7d","7D")}${w("30d","30D")}</span>
     </form>
     <div class="cards">
       <div class="card"><div class="v">${b(f.pageviews)}</div><div class="l">Pageviews</div></div>
       <div class="card"><div class="v">${b(f.visitors)}</div><div class="l">Visitors</div></div>
       <div class="card"><div class="v">${b(f.visits)}</div><div class="l">Visits</div></div>
       <div class="card"><div class="v">${g}</div><div class="l">Bounce rate</div></div>
       <div class="card"><div class="v">${b(d.visitors)}</div><div class="l">Online now</div></div>
     </div>
     <div class="panel"><h2>Traffic</h2>${Pe(u)}</div>
     <div class="panel"><h2>Live \u2014 last 30 minutes</h2>
       <table><tr><th>Page</th><th>Referrer</th><th>Time</th></tr>${x}</table></div>
     <div class="grid2">
       <div class="panel"><h2>Top pages</h2>
         <table><tr><th>Page</th><th>Path</th><th class="n">Views</th><th class="n">Visitors</th></tr>${U}</table></div>
       <div class="panel"><h2>Referrers</h2>
         <table><tr><th>Domain</th><th class="n">Views</th><th class="n">Visitors</th></tr>${h}</table></div>
     </div>
     <div class="panel"><h2>Custom events</h2>
       <table><tr><th>Event</th><th class="n">Count</th><th class="n">Visitors</th></tr>${S}</table></div>
     <div class="panel"><h2>Tracking snippet</h2>
       <p class="muted">Add this to every page of <strong>${l(n.name)}</strong>:</p>
       <pre class="snippet">&lt;script defer src="${l(o)}/tracker.js" data-website-id="${l(n.id)}"&gt;&lt;/script&gt;</pre>
       <p class="muted">Custom events: <code>lite.track('signup', { plan: 'pro' })</code></p></div>
     <p><a href="/?${A(t)}">All websites</a> \xB7 <a href="/logout">Sign out</a></p>`,`<a href="/?${A(t)}">Websites</a>`)}var ye=`(() => {
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
`;var j=365;async function Ne(e,t){let n=new Date(Date.now()-t*864e5);await R(e,"DELETE FROM event_data WHERE created_at < ?",n),await R(e,"DELETE FROM website_event WHERE created_at < ?",n),await R(e,"DELETE FROM session WHERE created_at < ?",n)}function D(e,t){let n={location:e};return t&&(n["set-cookie"]=t),new Response(null,{status:303,headers:n})}function C(e,t=200){return new Response(e,{status:t,headers:{"content-type":"text/html; charset=utf-8"}})}async function Oe(e,t){let n=Y(e);return n&&await K(t,n)?n:null}function q(e){return`/?s=${encodeURIComponent(e)}`}var ot={async fetch(e,t){let n=new URL(e.url),s=n.pathname,r=t.DB;if(!r||typeof r.prepare!="function")return Response.json({error:"database not available"},{status:500});let o={"access-control-allow-origin":"*","access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type","access-control-max-age":"86400"};if(s==="/api/send"||s==="/api/collect"){if(e.method==="OPTIONS")return new Response(null,{status:204,headers:o});if(e.method!=="POST")return Response.json({error:"method not allowed"},{status:405});let i=await ge(e,r),c=new Headers(i.headers);for(let[d,g]of Object.entries(o))c.set(d,g);return new Response(i.body,{status:i.status,headers:c})}if(s==="/tracker.js"&&e.method==="GET")return new Response(ye,{headers:{"content-type":"application/javascript; charset=utf-8","cache-control":"public, max-age=3600"}});if(s==="/api/health")return Response.json({ok:!0});let f=/^\/api\/admin\/migrate(?:\/([^/]+))?$/.exec(s);if(f&&e.method==="GET"){let i=n.searchParams.get("token")??f[1]??"",c=t.SETUP_TOKEN;if(!c||!$(i,c))return Response.json({error:"forbidden"},{status:403});let d=[];for(let g of J)await r.exec(g),d.push(g.split("(")[0].trim());return Response.json({ok:!0,applied:d})}if(s==="/api/cron/retention"&&e.method==="GET"){let i=e.headers.get("authorization")??"",c=t.CRON_SECRET;return!c||!$(i,`Bearer ${c}`)?Response.json({error:"forbidden"},{status:403}):(await Ne(r,j),Response.json({ok:!0,days:j}))}if(s==="/login"){if(e.method==="GET"){let i=Y(e);return i&&await K(t,i)?D(q(i)):C(k(t)?X():z())}if(e.method==="POST"){let i=await e.formData(),c=String(i.get("password")??"");if(await oe(t,c)){let d=await ce(t);return D(q(d),de(d))}return C(X("Wrong password."),401)}}if(s==="/logout")return D("/login",le());let u=await Oe(e,t);if(!u)return D("/login");if(!k(t))return C(z(),500);if(s==="/"&&e.method==="GET")return C(Ae(await G(r),u));if(s==="/api/websites"&&e.method==="POST"){let i=await e.formData(),c=String(i.get("name")??"").trim().slice(0,100),d=String(i.get("domain")??"").trim().slice(0,500)||null;if(!c)return D(q(u));let g=await Ee(r,c,d);return D(`/w/${g}?s=${encodeURIComponent(u)}`)}let m=/^\/w\/([0-9a-f-]{36})$/.exec(s);if(m&&e.method==="GET"){let i=await ve(r,m[1]);if(!i)return C('<p>Website not found.</p><p><a href="/">Back</a></p>',404);let c=["24h","7d","30d"].includes(n.searchParams.get("range"))?n.searchParams.get("range"):"30d",{start:d,end:g,bucket:L}=fe(c),w=`${n.protocol}//${n.host}`,[U,h,S,x,a,y,v]=await Promise.all([he(r,i.id,d,g),be(r,i.id,d,g,L),we(r,i.id,d,g),Re(r,i.id,d,g),_e(r,i.id,d,g),Se(r,i.id),G(r)]);return C(xe({website:i,websites:v,range:c,baseUrl:w,stats:U,series:h,pages:S,referrers:x,events:a,realtime:y},u))}if(s==="/api/admin/retention"&&e.method==="POST"){let i=Math.max(1,parseInt(n.searchParams.get("days")??String(j),10)||j);return await Ne(r,i),Response.json({ok:!0,days:i})}return new Response("Not found",{status:404})}};export{ot as default};
