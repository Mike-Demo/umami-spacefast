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

import { SpacefastDb } from './db';
import {
  authConfigured,
  checkSession,
  clearSessionCookie,
  Env,
  makeSession,
  sessionCookie,
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

async function requireAuth(req: Request, env: Env): Promise<Response | null> {
  if (!(await checkSession(env, req.headers.get('cookie')))) {
    return redirect('/login');
  }
  return null;
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
    if (path === '/api/send' || path === '/api/collect') {
      if (req.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405 });
      return handleCollect(req, db);
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

    // ---- auth pages ----
    if (path === '/login') {
      if (req.method === 'GET') {
        if (await checkSession(env, req.headers.get('cookie'))) return redirect('/');
        return html(authConfigured(env) ? loginPage() : setupNeededPage());
      }
      if (req.method === 'POST') {
        const form = await req.formData();
        const password = String(form.get('password') ?? '');
        if (await verifyPassword(env, password)) {
          return redirect('/', sessionCookie(await makeSession(env)));
        }
        return html(loginPage('Wrong password.'), 401);
      }
    }
    if (path === '/logout') {
      return redirect('/login', clearSessionCookie());
    }

    // ---- everything below needs auth ----
    const authed = await requireAuth(req, env);
    if (authed) return authed;
    if (!authConfigured(env)) return html(setupNeededPage(), 500);

    if (path === '/' && req.method === 'GET') {
      return html(websiteListPage(await listWebsites(db)));
    }

    if (path === '/api/websites' && req.method === 'POST') {
      const form = await req.formData();
      const name = String(form.get('name') ?? '').trim().slice(0, 100);
      const domain = String(form.get('domain') ?? '').trim().slice(0, 500) || null;
      if (!name) return redirect('/');
      const id = await createWebsite(db, name, domain);
      return redirect(`/w/${id}`);
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
        overviewPage({ website, websites, range, baseUrl, stats, series, pages, referrers, events, realtime }),
      );
    }

    if (path === '/api/admin/retention' && req.method === 'POST') {
      const days = Math.max(
        1,
        parseInt(url.searchParams.get('days') ?? String(RETENTION_DAYS_DEFAULT), 10) || RETENTION_DAYS_DEFAULT,
      );
      const cutoff = new Date(Date.now() - days * 86400000);
      await run(db, 'DELETE FROM event_data WHERE created_at < ?', cutoff);
      await run(db, 'DELETE FROM website_event WHERE created_at < ?', cutoff);
      await run(db, 'DELETE FROM session WHERE created_at < ?', cutoff);
      return Response.json({ ok: true, days });
    }

    return new Response('Not found', { status: 404 });
  },
};
