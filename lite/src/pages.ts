// Dashboard: queries + server-rendered HTML pages.

import { all, first, run, SpacefastDb } from './db';
import { esc, uuid } from './util';

export type RangeKey = '24h' | '7d' | '30d';

export function rangeDates(range: RangeKey): { start: Date; end: Date; bucket: 'hour' | 'day' } {
  const end = new Date();
  const start = new Date(end);
  if (range === '24h') {
    start.setHours(start.getHours() - 24);
    return { start, end, bucket: 'hour' };
  }
  start.setDate(start.getDate() - (range === '7d' ? 7 : 30));
  return { start, end, bucket: 'day' };
}

// ---------- queries ----------

export interface Stats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
}

export async function getStats(
  db: SpacefastDb,
  websiteId: string,
  start: Date,
  end: Date,
): Promise<Stats> {
  const row = await first(
    db,
    `SELECT
       COUNT(*) AS pageviews,
       COUNT(DISTINCT session_id) AS visitors,
       COUNT(DISTINCT visit_id) AS visits,
       SUM(CASE WHEN e.c = 1 THEN 1 ELSE 0 END) AS bounces
     FROM (
       SELECT session_id, visit_id, COUNT(*) AS c
       FROM website_event
       WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
       GROUP BY session_id, visit_id
     ) e`,
    websiteId,
    start,
    end,
  );
  return {
    pageviews: Number(row?.pageviews ?? 0),
    visitors: Number(row?.visitors ?? 0),
    visits: Number(row?.visits ?? 0),
    bounces: Number(row?.bounces ?? 0),
  };
}

export interface SeriesPoint {
  label: string;
  pageviews: number;
  visitors: number;
}

export async function getSeries(
  db: SpacefastDb,
  websiteId: string,
  start: Date,
  end: Date,
  bucket: 'hour' | 'day',
): Promise<SeriesPoint[]> {
  const fmt = bucket === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
  const rows = await all(
    db,
    `SELECT DATE_FORMAT(created_at, '${fmt}') AS label,
            COUNT(*) AS pageviews,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
     GROUP BY label ORDER BY label`,
    websiteId,
    start,
    end,
  );
  return rows.map(r => ({
    label: String(r.label),
    pageviews: Number(r.pageviews),
    visitors: Number(r.visitors),
  }));
}

export async function getTopPages(db: SpacefastDb, websiteId: string, start: Date, end: Date) {
  return all(
    db,
    `SELECT url_path AS path, MAX(page_title) AS title, COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
     GROUP BY url_path ORDER BY views DESC LIMIT 10`,
    websiteId,
    start,
    end,
  );
}

export async function getReferrers(db: SpacefastDb, websiteId: string, start: Date, end: Date) {
  return all(
    db,
    `SELECT referrer_domain AS domain, COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 1
       AND referrer_domain IS NOT NULL AND referrer_domain != ''
     GROUP BY referrer_domain ORDER BY views DESC LIMIT 10`,
    websiteId,
    start,
    end,
  );
}

export async function getCustomEvents(db: SpacefastDb, websiteId: string, start: Date, end: Date) {
  return all(
    db,
    `SELECT event_name AS name, COUNT(*) AS count,
            COUNT(DISTINCT session_id) AS visitors
     FROM website_event
     WHERE website_id = ? AND created_at BETWEEN ? AND ? AND event_type = 2
     GROUP BY event_name ORDER BY count DESC LIMIT 10`,
    websiteId,
    start,
    end,
  );
}

export async function getRealtime(db: SpacefastDb, websiteId: string) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const rows = await all(
    db,
    `SELECT url_path AS path, page_title AS title, referrer_domain AS ref,
            created_at AS at
     FROM website_event
     WHERE website_id = ? AND created_at >= ? AND event_type = 1
     ORDER BY created_at DESC LIMIT 20`,
    websiteId,
    since,
  );
  const count = await first(
    db,
    `SELECT COUNT(DISTINCT session_id) AS visitors
     FROM website_event WHERE website_id = ? AND created_at >= ? AND event_type = 1`,
    websiteId,
    since,
  );
  return { visitors: Number(count?.visitors ?? 0), rows };
}

export async function listWebsites(db: SpacefastDb) {
  return all(db, 'SELECT website_id AS id, name, domain FROM website ORDER BY name');
}

export async function getWebsite(db: SpacefastDb, id: string) {
  return first(db, 'SELECT website_id AS id, name, domain FROM website WHERE website_id = ?', id);
}

export async function createWebsite(db: SpacefastDb, name: string, domain: string | null) {
  const id = uuid();
  await run(
    db,
    'INSERT INTO website (website_id, name, domain, created_at) VALUES (?, ?, ?, ?)',
    id,
    name,
    domain,
    new Date(),
  );
  return id;
}

// ---------- html ----------

const CSS = `
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
`;

function layout(title: string, body: string, nav = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · Lite Analytics</title>
<style>${CSS}</style></head>
<body><div class="wrap">
<header class="top"><h1>Lite Analytics</h1><nav>${nav}</nav></header>
${body}</div></body></html>`;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function barChart(series: SeriesPoint[]): string {
  if (!series.length) return '<p class="muted">No data yet.</p>';
  const W = 720;
  const H = 180;
  const pad = 8;
  const max = Math.max(...series.map(p => p.pageviews), 1);
  const n = series.length;
  const bw = Math.max(2, (W - pad * 2) / n - 3);
  let bars = '';
  series.forEach((p, i) => {
    const h = Math.max(2, ((H - 30) * p.pageviews) / max);
    const x = pad + i * ((W - pad * 2) / n);
    bars += `<rect x="${x.toFixed(1)}" y="${(H - 20 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="#7c5cff"><title>${esc(p.label)}: ${p.pageviews} views, ${p.visitors} visitors</title></rect>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Pageviews chart">${bars}
<text x="${pad}" y="${H - 4}" font-size="10" opacity=".6">${esc(series[0].label.slice(5))}</text>
<text x="${W - pad - 60}" y="${H - 4}" font-size="10" opacity=".6">${esc(series[n - 1].label.slice(5))}</text></svg>`;
}

export function loginPage(error?: string): string {
  return layout(
    'Sign in',
    `<div class="panel" style="max-width:380px"><h2>Sign in</h2>
    ${error ? `<div class="err">${esc(error)}</div>` : ''}
    <form method="post" action="/login">
      <p><input type="password" name="password" placeholder="Admin password" autocomplete="current-password" required style="width:100%"></p>
      <p><button type="submit" style="width:100%">Sign in</button></p>
    </form></div>`,
  );
}

export function setupNeededPage(): string {
  return layout(
    'Setup needed',
    `<div class="panel"><h2>Admin login not configured</h2>
    <p>Set the <code>ADMIN_PASSWORD_HASH</code>, <code>ADMIN_SALT</code> and <code>ADMIN_SECRET</code>
    environment variables on the space, then redeploy. See README for how to generate them.</p></div>`,
  );
}

export function websiteListPage(websites: Record<string, any>[]): string {
  const rows =
    websites.length === 0
      ? '<p class="muted">No websites yet. Add one below to get a tracking ID.</p>'
      : `<table><tr><th>Name</th><th>Domain</th><th></th></tr>${websites
          .map(
            w =>
              `<tr><td>${esc(w.name)}</td><td>${esc(w.domain)}</td><td><a href="/w/${esc(w.id)}">Open</a></td></tr>`,
          )
          .join('')}</table>`;
  return layout(
    'Websites',
    `<div class="panel"><h2>Websites</h2>${rows}</div>
    <div class="panel"><h2>Add website</h2>
      <form method="post" action="/api/websites" class="inline">
        <input name="name" placeholder="Name" required maxlength="100">
        <input name="domain" placeholder="example.com" maxlength="500">
        <button type="submit">Add</button>
      </form></div>
    <p><a href="/logout">Sign out</a></p>`,
    `<a href="/" class="on">Websites</a>`,
  );
}

export function overviewPage(opts: {
  website: Record<string, any>;
  websites: Record<string, any>[];
  range: RangeKey;
  baseUrl: string;
  stats: Stats;
  series: SeriesPoint[];
  pages: Record<string, any>[];
  referrers: Record<string, any>[];
  events: Record<string, any>[];
  realtime: { visitors: number; rows: Record<string, any>[] };
}): string {
  const { website, websites, range, baseUrl, stats, series, pages, referrers, events, realtime } =
    opts;
  const bounceRate =
    stats.visits > 0 ? `${Math.round((stats.bounces / stats.visits) * 100)}%` : '—';
  const siteOptions = websites
    .map(w => `<option value="${esc(w.id)}"${w.id === website.id ? ' selected' : ''}>${esc(w.name)}</option>`)
    .join('');
  const rangeLink = (r: RangeKey, label: string) =>
    `<a href="/w/${esc(website.id)}?range=${r}" class="${range === r ? 'on' : ''}">${label}</a>`;

  const pageRows =
    pages.length === 0
      ? '<tr><td colspan="3" class="muted">No pageviews yet.</td></tr>'
      : pages
          .map(
            p =>
              `<tr><td>${esc(p.title || p.path)}</td><td class="muted">${esc(p.path)}</td><td class="n">${fmt(Number(p.views))}</td><td class="n">${fmt(Number(p.visitors))}</td></tr>`,
          )
          .join('');
  const refRows =
    referrers.length === 0
      ? '<tr><td colspan="3" class="muted">No referrers yet.</td></tr>'
      : referrers
          .map(
            r =>
              `<tr><td>${esc(r.domain)}</td><td class="n">${fmt(Number(r.views))}</td><td class="n">${fmt(Number(r.visitors))}</td></tr>`,
          )
          .join('');
  const eventRows =
    events.length === 0
      ? '<tr><td colspan="3" class="muted">No custom events yet.</td></tr>'
      : events
          .map(
            e =>
              `<tr><td>${esc(e.name)}</td><td class="n">${fmt(Number(e.count))}</td><td class="n">${fmt(Number(e.visitors))}</td></tr>`,
          )
          .join('');
  const rtRows =
    realtime.rows.length === 0
      ? '<tr><td colspan="3" class="muted">No visits in the last 30 minutes.</td></tr>'
      : realtime.rows
          .map(
            r =>
              `<tr><td>${esc(r.title || r.path)}</td><td class="muted">${esc(r.ref || 'direct')}</td><td class="muted">${esc(String(r.at).slice(11, 19))}</td></tr>`,
          )
          .join('');

  return layout(
    website.name,
    `<form class="inline" style="margin-bottom:12px" onchange="location='/w/'+this.site.value+'?range=${range}'">
       <select name="site">${siteOptions}</select>
       <span class="range">${rangeLink('24h', '24H')}${rangeLink('7d', '7D')}${rangeLink('30d', '30D')}</span>
     </form>
     <div class="cards">
       <div class="card"><div class="v">${fmt(stats.pageviews)}</div><div class="l">Pageviews</div></div>
       <div class="card"><div class="v">${fmt(stats.visitors)}</div><div class="l">Visitors</div></div>
       <div class="card"><div class="v">${fmt(stats.visits)}</div><div class="l">Visits</div></div>
       <div class="card"><div class="v">${bounceRate}</div><div class="l">Bounce rate</div></div>
       <div class="card"><div class="v">${fmt(realtime.visitors)}</div><div class="l">Online now</div></div>
     </div>
     <div class="panel"><h2>Traffic</h2>${barChart(series)}</div>
     <div class="panel"><h2>Live — last 30 minutes</h2>
       <table><tr><th>Page</th><th>Referrer</th><th>Time</th></tr>${rtRows}</table></div>
     <div class="grid2">
       <div class="panel"><h2>Top pages</h2>
         <table><tr><th>Page</th><th>Path</th><th class="n">Views</th><th class="n">Visitors</th></tr>${pageRows}</table></div>
       <div class="panel"><h2>Referrers</h2>
         <table><tr><th>Domain</th><th class="n">Views</th><th class="n">Visitors</th></tr>${refRows}</table></div>
     </div>
     <div class="panel"><h2>Custom events</h2>
       <table><tr><th>Event</th><th class="n">Count</th><th class="n">Visitors</th></tr>${eventRows}</table></div>
     <div class="panel"><h2>Tracking snippet</h2>
       <p class="muted">Add this to every page of <strong>${esc(website.name)}</strong>:</p>
       <pre class="snippet">&lt;script defer src="${esc(baseUrl)}/tracker.js" data-website-id="${esc(website.id)}"&gt;&lt;/script&gt;</pre>
       <p class="muted">Custom events: <code>lite.track('signup', { plan: 'pro' })</code></p></div>
     <p><a href="/">All websites</a> · <a href="/logout">Sign out</a></p>`,
    `<a href="/">Websites</a>`,
  );
}
