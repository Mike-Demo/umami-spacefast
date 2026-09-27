// Lite analytics: tracker collect + dashboard in one tiny worker.
// Routes:
//   POST /api/send, /api/collect   tracker payloads (public)
//   GET  /tracker.js                tracker script (public)
//   GET  /api/health                health check (public)
//   GET  /login  POST /login        admin sign-in
//   GET  /logout
//   GET  /                         website list (auth)
//   POST /api/websites              create website (auth, form post)
//   GET  /w/:id                     dashboard overview (auth)
//   POST /api/admin/retention       delete rows older than N days (auth)
//   GET  /api/admin/migrate?token=  one-time schema setup (SETUP_TOKEN-gated)
//   GET  /api/cron/retention        scheduled retention (CRON_SECRET bearer)

import { SpacefastDb } from './db';
import { SCHEMA_STATEMENTS } from './schema';
import {
  authConfigured,
  checkSession,
  checkSessionToken,
  clearSessionCookie,
  Env,
  getSessionToken,
  makeSession,
  sessionCookie,
  timingSafeEqual,
  verifyPassword,
} from './auth';
import { handleCollect } from './collect';
import {
  createWebsite,
  getCustomEvents,
  getReferrers,
  getRealtime,
  getSeries,
  getStats,
  getTopPages,
  getWebsite,
  listWebsites,
  loginPage,
  overviewPage,
  rangeDates,
  RangeKey,
  setupNeededPage,
  websiteListPage,
} from './pages';
import { TRACKER_JS } from './tracker';
import { run } from './db';

const RETENTION_DAYS_DEFAULT = 365;

async function pruneRetention(db: SpacefastDb, days: number): Promise<void> {
  const cutoff = new Date(Date.now() - days * 86400000);
  await run(db, 'DELETE FROM event_data WHERE created_at < ?', cutoff);
  await run(db, 'DELETE FROM website_event WHERE created_at < ?', cutoff);
  await run(db, 'DELETE FROM session WHERE created_at < ?', cutoff);
}

function redirect(to: string, cookie?: string): Response {
  const headers: Record<string, string> = { location: to };
  if (cookie) headers['set-cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// Returns the valid session token, or null when the request is unauthenticated.
async function requireAuth(req: Request, env: Env): Promise<string | null> {
  const token = getSessionToken(req);
  if (token && (await checkSessionToken(env, token))) return token;
  return null;
}

function loginRedirect(token: string): string {
  return `/?s=${encodeURIComponent(token)}`;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const db = env.DB as SpacefastDb;

    if (!db || typeof db.prepare !== 'function') {
      return Response.json({ error: 'database not available' }, { status: 500 });
    }

    // ---- public: tracker ----
    // Cross-origin: the tracker script runs on project domains and POSTs here,
    // so preflights must succeed and responses must carry CORS headers.
    // No credentials are used, so a wildcard origin is fine.
    const CORS_HEADERS = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    };
    if (path === '/api/send' || path === '/api/collect') {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
      if (req.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405 });
      const res = await handleCollect(req, db);
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
      return new Response(res.body, { status: res.status, headers });
    }
    if (path === '/tracker.js' && req.method === 'GET') {
      return new Response(TRACKER_JS, {
        headers: {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
    if (path === '/api/health') {
      return Response.json({ ok: true });
    }

    // ---- one-time schema setup (token-gated; remove SETUP_TOKEN after use) ----
    // Token accepted as ?token= or as the path segment /api/admin/migrate/<token>
    // (sf fetch only fetches plain paths, so the segment form exists for ops use).
    const migrateMatch = /^\/api\/admin\/migrate(?:\/([^/]+))?$/.exec(path);
    if (migrateMatch && req.method === 'GET') {
      const token = url.searchParams.get('token') ?? migrateMatch[1] ?? '';
      const expected = (env as Env).SETUP_TOKEN as string | undefined;
      if (!expected || !timingSafeEqual(token, expected)) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      const applied: string[] = [];
      for (const stmt of SCHEMA_STATEMENTS) {
        await db.exec(stmt);
        applied.push(stmt.split('(')[0].trim());
      }
      return Response.json({ ok: true, applied });
    }

    // ---- scheduled retention (called by Spacefast crons; bearer-gated) ----
    if (path === '/api/cron/retention' && req.method === 'GET') {
      const auth = req.headers.get('authorization') ?? '';
      const expected = (env as Env).CRON_SECRET as string | undefined;
      if (!expected || !timingSafeEqual(auth, `Bearer ${expected}`)) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      await pruneRetention(db, RETENTION_DAYS_DEFAULT);
      return Response.json({ ok: true, days: RETENTION_DAYS_DEFAULT });
    }

    // ---- auth pages ----
    if (path === '/login') {
      if (req.method === 'GET') {
        const existing = getSessionToken(req);
        if (existing && (await checkSessionToken(env, existing)))
          return redirect(loginRedirect(existing));
        return html(authConfigured(env) ? loginPage() : setupNeededPage());
      }
      if (req.method === 'POST') {
        const form = await req.formData();
        const password = String(form.get('password') ?? '');
        if (await verifyPassword(env, password)) {
          const token = await makeSession(env);
          // Set the cookie too (harmless where the edge strips it); the ?s=
          // token is the primary session transport.
          return redirect(loginRedirect(token), sessionCookie(token));
        }
        return html(loginPage('Wrong password.'), 401);
      }
    }
    if (path === '/logout') {
      return redirect('/login', clearSessionCookie());
    }

    // ---- everything below needs auth ----
    const token = await requireAuth(req, env);
    if (!token) return redirect('/login');
    if (!authConfigured(env)) return html(setupNeededPage(), 500);

    if (path === '/' && req.method === 'GET') {
      return html(websiteListPage(await listWebsites(db), token));
    }

    if (path === '/api/websites' && req.method === 'POST') {
      const form = await req.formData();
      const name = String(form.get('name') ?? '').trim().slice(0, 100);
      const domain = String(form.get('domain') ?? '').trim().slice(0, 500) || null;
      if (!name) return redirect(loginRedirect(token));
      const id = await createWebsite(db, name, domain);
      return redirect(`/w/${id}?s=${encodeURIComponent(token)}`);
    }

    const wMatch = /^\/w\/([0-9a-f-]{36})$/.exec(path);
    if (wMatch && req.method === 'GET') {
      const website = await getWebsite(db, wMatch[1]);
      if (!website) return html('<p>Website not found.</p><p><a href="/">Back</a></p>', 404);
      const range = (['24h', '7d', '30d'] as RangeKey[]).includes(url.searchParams.get('range') as RangeKey)
        ? (url.searchParams.get('range') as RangeKey)
        : '30d';
      const { start, end, bucket } = rangeDates(range);
      const baseUrl = `${url.protocol}//${url.host}`;
      const [stats, series, pages, referrers, events, realtime, websites] = await Promise.all([
        getStats(db, website.id, start, end),
        getSeries(db, website.id, start, end, bucket),
        getTopPages(db, website.id, start, end),
        getReferrers(db, website.id, start, end),
        getCustomEvents(db, website.id, start, end),
        getRealtime(db, website.id),
        listWebsites(db),
      ]);
      return html(
        overviewPage(
          { website, websites, range, baseUrl, stats, series, pages, referrers, events, realtime },
          token,
        ),
      );
    }

    if (path === '/api/admin/retention' && req.method === 'POST') {
      const days = Math.max(
        1,
        parseInt(url.searchParams.get('days') ?? String(RETENTION_DAYS_DEFAULT), 10) || RETENTION_DAYS_DEFAULT,
      );
      await pruneRetention(db, days);
      return Response.json({ ok: true, days });
    }

    return new Response('Not found', { status: 404 });
  },
};
