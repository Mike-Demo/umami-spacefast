// End-to-end harness: runs the built worker against an in-memory fake of env.DB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

function makeDb() {
  const tables = { website: [], session: [], website_event: [], event_data: [] };
  const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();

  function insert(table, cols, params, ignore) {
    const row = {};
    cols.forEach((c, i) => (row[c] = params[i]));
    const pk = { website: 'website_id', session: 'session_id', website_event: 'event_id', event_data: 'event_data_id' }[table];
    if (ignore && tables[table].some(r => r[pk] === row[pk])) return;
    tables[table].push(row);
  }

  const handlers = [
    {
      m: s => s.startsWith('insert ignore into session'),
      fn: (sql, p) => insert('session', ['session_id', 'website_id', 'browser', 'os', 'device', 'screen', 'language', 'country', 'created_at'], p, true),
    },
    {
      m: s => s.startsWith('insert into website_event'),
      fn: (sql, p) =>
        insert('website_event', ['event_id', 'website_id', 'session_id', 'visit_id', 'created_at', 'url_path', 'url_query', 'referrer_domain', 'referrer_path', 'referrer_query', 'page_title', 'event_type', 'event_name', 'hostname', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'tag'], p, false),
    },
    {
      m: s => s.startsWith('insert into event_data'),
      fn: (sql, p) => insert('event_data', ['event_data_id', 'website_id', 'website_event_id', 'data_key', 'string_value', 'number_value', 'data_type', 'created_at'], p, false),
    },
    {
      m: s => s.startsWith('insert into website '),
      fn: (sql, p) => insert('website', ['website_id', 'name', 'domain', 'created_at'], p, false),
    },
    {
      m: s => s.startsWith('select website_id from website where website_id = ?'),
      fn: (sql, p) => ({ first: tables.website.find(r => r.website_id === p[0]) ?? null }),
    },
    {
      m: s => s.startsWith('select website_id as id, name, domain from website order by name'),
      fn: () => ({ all: tables.website.map(r => ({ id: r.website_id, name: r.name, domain: r.domain })) }),
    },
    {
      m: s => s.startsWith('select website_id as id, name, domain from website where website_id = ?'),
      fn: (sql, p) => {
        const r = tables.website.find(x => x.website_id === p[0]);
        return { first: r ? { id: r.website_id, name: r.name, domain: r.domain } : null };
      },
    },
    {
      // stats query
      m: s => s.includes('count(distinct visit_id)') && s.includes('as bounces'),
      fn: (sql, p) => {
        const [wid, start, end] = p;
        const evs = tables.website_event.filter(
          r => r.website_id === wid && r.created_at >= start && r.created_at <= end && r.event_type === 1,
        );
        const groups = new Map();
        for (const e of evs) {
          const k = e.session_id + '|' + e.visit_id;
          if (!groups.has(k)) groups.set(k, 0);
          groups.set(k, groups.get(k) + 1);
        }
        let bounces = 0;
        for (const c of groups.values()) if (c === 1) bounces++;
        return {
          first: {
            pageviews: evs.length,
            visitors: new Set(evs.map(e => e.session_id)).size,
            visits: new Set(evs.map(e => e.visit_id)).size,
            bounces,
          },
        };
      },
    },
    {
      // series query
      m: s => s.includes("date_format(created_at,"),
      fn: (sql, p) => {
        const [wid, start, end] = p;
        const hourly = sql.includes('%h:00');
        const groups = new Map();
        for (const e of tables.website_event) {
          if (e.website_id !== wid || e.created_at < start || e.created_at > end || e.event_type !== 1) continue;
          const label = hourly ? e.created_at.slice(0, 13) + ':00' : e.created_at.slice(0, 10);
          if (!groups.has(label)) groups.set(label, { label, pageviews: 0, visitors: new Set() });
          const g = groups.get(label);
          g.pageviews++;
          g.visitors.add(e.session_id);
        }
        const rows = [...groups.values()]
          .sort((a, b) => (a.label < b.label ? -1 : 1))
          .map(g => ({ label: g.label, pageviews: g.pageviews, visitors: g.visitors.size }));
        return { all: rows };
      },
    },
    {
      // top pages
      m: s => s.includes('group by url_path'),
      fn: (sql, p) => {
        const [wid, start, end] = p;
        const groups = new Map();
        for (const e of tables.website_event) {
          if (e.website_id !== wid || e.created_at < start || e.created_at > end || e.event_type !== 1) continue;
          if (!groups.has(e.url_path)) groups.set(e.url_path, { path: e.url_path, title: e.page_title, views: 0, visitors: new Set() });
          const g = groups.get(e.url_path);
          g.views++;
          g.visitors.add(e.session_id);
          if (e.page_title) g.title = e.page_title;
        }
        return { all: [...groups.values()].sort((a, b) => b.views - a.views).slice(0, 10).map(g => ({ ...g, visitors: g.visitors.size })) };
      },
    },
    {
      // referrers
      m: s => s.includes('group by referrer_domain'),
      fn: (sql, p) => {
        const [wid, start, end] = p;
        const groups = new Map();
        for (const e of tables.website_event) {
          if (e.website_id !== wid || e.created_at < start || e.created_at > end || e.event_type !== 1) continue;
          if (!e.referrer_domain) continue;
          if (!groups.has(e.referrer_domain)) groups.set(e.referrer_domain, { domain: e.referrer_domain, views: 0, visitors: new Set() });
          const g = groups.get(e.referrer_domain);
          g.views++;
          g.visitors.add(e.session_id);
        }
        return { all: [...groups.values()].sort((a, b) => b.views - a.views).slice(0, 10).map(g => ({ ...g, visitors: g.visitors.size })) };
      },
    },
    {
      // custom events
      m: s => s.includes('group by event_name'),
      fn: (sql, p) => {
        const [wid, start, end] = p;
        const groups = new Map();
        for (const e of tables.website_event) {
          if (e.website_id !== wid || e.created_at < start || e.created_at > end || e.event_type !== 2) continue;
          if (!groups.has(e.event_name)) groups.set(e.event_name, { name: e.event_name, count: 0, visitors: new Set() });
          const g = groups.get(e.event_name);
          g.count++;
          g.visitors.add(e.session_id);
        }
        return { all: [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 10).map(g => ({ ...g, visitors: g.visitors.size })) };
      },
    },
    {
      // realtime list
      m: s => s.includes('order by created_at desc limit 20'),
      fn: (sql, p) => {
        const [wid, since] = p;
        const rows = tables.website_event
          .filter(e => e.website_id === wid && e.created_at >= since && e.event_type === 1)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, 20)
          .map(e => ({ path: e.url_path, title: e.page_title, ref: e.referrer_domain, at: e.created_at }));
        return { all: rows };
      },
    },
    {
      // realtime visitor count
      m: s => s.includes('count(distinct session_id) as visitors'),
      fn: (sql, p) => {
        const [wid, since] = p;
        const s = new Set(
          tables.website_event.filter(e => e.website_id === wid && e.created_at >= since && e.event_type === 1).map(e => e.session_id),
        );
        return { first: { visitors: s.size } };
      },
    },
    {
      m: s => s.startsWith('delete from event_data where created_at < ?'),
      fn: (sql, p) => { tables.event_data = tables.event_data.filter(r => r.created_at >= p[0]); },
    },
    {
      m: s => s.startsWith('delete from website_event where created_at < ?'),
      fn: (sql, p) => { tables.website_event = tables.website_event.filter(r => r.created_at >= p[0]); },
    },
    {
      m: s => s.startsWith('delete from session where created_at < ?'),
      fn: (sql, p) => { tables.session = tables.session.filter(r => r.created_at >= p[0]); },
    },
  ];

  const db = {
    tables,
    prepare(sql) {
      const n = norm(sql);
      const h = handlers.find(x => x.m(n));
      if (!h) throw new Error('unhandled SQL in harness: ' + sql.slice(0, 120));
      const stmt = {
        bind(...params) {
          return {
            all: async () => ({ results: (await Promise.resolve(h.fn(n, params)))?.all ?? [] }),
            first: async () => (await Promise.resolve(h.fn(n, params)))?.first ?? null,
            run: async () => { await Promise.resolve(h.fn(n, params)); return { meta: {} }; },
          };
        },
        all() { return this.bind().all(); },
        first() { return this.bind().first(); },
        run() { return this.bind().run(); },
      };
      return stmt;
    },
    exec: async () => ({}),
  };
  return db;
}

const SALT = 'ab'.repeat(32);
const SECRET = 'cd'.repeat(32);

async function pbkdf2(password) {
  const salt = new Uint8Array(SALT.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const PASSWORD_HASH = await pbkdf2('test-password-123');
const env = { DB: makeDb(), ADMIN_PASSWORD_HASH: PASSWORD_HASH, ADMIN_SALT: SALT, ADMIN_SECRET: SECRET };

const call = (path, opts = {}) =>
  worker.fetch(new Request(`https://x.test${path}`, opts), env);

test('health check', async () => {
  const r = await call('/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test('tracker script served', async () => {
  const r = await call('/tracker.js');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /javascript/);
  assert.match(await r.text(), /data-website-id/);
});

test('collect rejects unknown website', async () => {
  const r = await call('/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'event', payload: { website: '11111111-1111-1111-1111-111111111111', url: 'https://a.com/' } }),
  });
  assert.equal(r.status, 400);
});

let websiteId;
test('login + create website', async () => {
  let r = await call('/login');
  assert.match(await r.text(), /Sign in/);
  r = await call('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'password=wrong',
  });
  assert.equal(r.status, 401);
  r = await call('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'password=test-password-123',
  });
  assert.equal(r.status, 303);
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /lite_session=/);
  env._cookie = cookie.split(';')[0];

  const authed = (path, opts = {}) => {
    opts.headers = { ...(opts.headers || {}), cookie: env._cookie };
    return call(path, opts);
  };
  env._authed = authed;

  r = await authed('/api/websites', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'name=Test+Site&domain=test.example.com',
  });
  assert.equal(r.status, 303);
  websiteId = r.headers.get('location').split('/w/')[1];
  assert.match(websiteId, /^[0-9a-f-]{36}$/);
});

test('collect pageview + event, privacy scrubbing', async () => {
  const payload = {
    website: websiteId,
    hostname: 'test.example.com',
    url: 'https://test.example.com/pricing?token=secret123&plan=pro&email=a@b.com',
    referrer: 'https://google.com/search?q=x',
    title: 'Pricing',
    language: 'en-us',
    screen: '1920x1080',
  };
  let r = await call('/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/120' },
    body: JSON.stringify({ type: 'event', payload }),
  });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });

  // custom event with data incl. sensitive values
  r = await call('/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/120' },
    body: JSON.stringify({
      type: 'event',
      payload: { ...payload, url: 'https://test.example.com/pricing', name: 'signup', data: { plan: 'pro', email: 'user@x.com', n: 3 } },
    }),
  });
  assert.equal(r.status, 200);

  const evs = env.DB.tables.website_event;
  assert.equal(evs.length, 2);
  assert.equal(evs[0].url_query, 'plan=pro'); // token + email params dropped entirely
  assert.ok(!evs[0].url_query.includes('secret123'));
  assert.equal(evs[0].referrer_domain, 'google.com');
  assert.equal(evs[0].event_type, 1);
  assert.equal(evs[1].event_type, 2);
  assert.equal(evs[1].event_name, 'signup');
  // same visitor+day => same session
  assert.equal(evs[0].session_id, evs[1].session_id);

  const ed = env.DB.tables.event_data;
  const keys = ed.map(x => x.data_key).sort();
  assert.deepEqual(keys, ['n', 'plan']); // email key dropped
  assert.equal(env.DB.tables.session.length, 1);
  assert.equal(env.DB.tables.session[0].browser, 'chrome');
});

test('bot traffic ignored', async () => {
  const before = env.DB.tables.website_event.length;
  const r = await call('/api/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'Googlebot/2.1' },
    body: JSON.stringify({ type: 'event', payload: { website: websiteId, url: 'https://test.example.com/' } }),
  });
  assert.equal(r.status, 200);
  assert.equal(env.DB.tables.website_event.length, before);
});

test('dashboard renders stats', async () => {
  const r = await env._authed(`/w/${websiteId}?range=24h`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Pricing/);
  assert.match(html, /google\.com/);
  assert.match(html, /signup/);
  assert.match(html, /<div class="v">1<\/div><div class="l">Pageviews<\/div>/);
  assert.match(html, /<div class="v">1<\/div><div class="l">Visitors<\/div>/);
  assert.match(html, /tracker\.js/);
});

test('retention deletes old rows', async () => {
  env.DB.tables.website_event.push({
    event_id: 'old', website_id: websiteId, session_id: 's', visit_id: 'v',
    created_at: '2020-01-01 00:00:00', url_path: '/old', event_type: 1,
  });
  const r = await env._authed('/api/admin/retention?days=365', { method: 'POST' });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, days: 365 });
  assert.ok(!env.DB.tables.website_event.some(e => e.event_id === 'old'));
  assert.equal(env.DB.tables.website_event.length, 2);
});

test('logout clears session', async () => {
  const r = await env._authed('/logout');
  assert.equal(r.status, 303);
  const r2 = await call('/');
  assert.equal(r2.status, 303);
  assert.equal(r2.headers.get('location'), '/login');
});
