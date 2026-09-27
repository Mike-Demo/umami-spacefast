// Tracker collect endpoint: POST /api/send (alias /api/collect).
// Accepts Umami tracker payloads: { type: 'event', payload: {...} }.
// Privacy: IPs are never stored (salted daily hash only, for session derivation).
// Query strings are scrubbed of sensitive params/values before storage.

import { all, first, q, run, SpacefastDb } from './db';
import {
  clientIp,
  daySalt,
  hourSalt,
  idFrom,
  isBot,
  isUuid,
  parseClient,
  truncate,
  uuid,
} from './util';

const SENSITIVE_KEY_RE = /token|password|passwd|secret|api[_-]?key|auth|session|email|e-mail/i;
const EMAIL_VALUE_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function scrubQuery(raw: string | null): string | null {
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const kept: [string, string][] = [];
  for (const [k, v] of params) {
    if (SENSITIVE_KEY_RE.test(k)) continue;
    kept.push([k, EMAIL_VALUE_RE.test(v) ? '[redacted]' : v]);
  }
  if (!kept.length) return null;
  return kept
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function parseUrl(raw: string | undefined | null, hostname: string | undefined | null) {
  const base = hostname ? `https://${hostname}` : 'https://localhost';
  try {
    const u = new URL(raw ?? '/', base);
    return {
      path: truncate(u.pathname === '/undefined' ? '' : u.pathname + u.hash, 500) ?? '',
      query: scrubQuery(u.search ? u.search.slice(1) : null),
      utmSource: truncate(u.searchParams.get('utm_source'), 255),
      utmMedium: truncate(u.searchParams.get('utm_medium'), 255),
      utmCampaign: truncate(u.searchParams.get('utm_campaign'), 255),
      utmContent: truncate(u.searchParams.get('utm_content'), 255),
      utmTerm: truncate(u.searchParams.get('utm_term'), 255),
    };
  } catch {
    return {
      path: '/',
      query: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
    };
  }
}

function parseReferrer(raw: string | undefined | null, hostname: string | undefined | null) {
  if (!raw) return { domain: null, path: null, query: null };
  try {
    const base = hostname ? `https://${hostname}` : 'https://localhost';
    const u = new URL(raw, base);
    const host = (hostname ?? '').replace(/^www\./, '');
    const refHost = u.hostname.replace(/^www\./, '');
    // Never store the referrer domain when it matches the site itself.
    const domain = refHost && refHost !== host ? truncate(refHost, 500) : null;
    return {
      domain,
      path: truncate(u.pathname + u.hash, 500),
      query: scrubQuery(u.search ? u.search.slice(1) : null),
    };
  } catch {
    return { domain: null, path: null, query: null };
  }
}

export async function handleCollect(req: Request, db: SpacefastDb): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const { type, payload } = body ?? {};
  if (type !== 'event' || !payload || typeof payload !== 'object') {
    // identify/performance/record types are accepted but not stored in lite scope.
    return Response.json({ ok: true });
  }

  const websiteId = payload.website;
  if (!isUuid(websiteId)) {
    return Response.json({ error: 'invalid website id' }, { status: 400 });
  }

  const website = await first(db, 'SELECT website_id FROM website WHERE website_id = ?', websiteId);
  if (!website) {
    return Response.json({ error: 'website not found' }, { status: 400 });
  }

  const ua = req.headers.get('user-agent');
  if (isBot(ua)) {
    return Response.json({ ok: true });
  }

  const now = new Date();
  const createdAt = payload.timestamp
    ? new Date(Math.floor(Number(payload.timestamp)) * 1000)
    : now;
  if (Number.isNaN(createdAt.getTime())) {
    return Response.json({ error: 'invalid timestamp' }, { status: 400 });
  }

  const ip = clientIp(req);
  const { browser, os, device } = parseClient(ua);

  // Deterministic daily session id from salted hash — IP is never stored.
  const sessionId = await idFrom(websiteId, ip, ua ?? '', daySalt(now), 'session');
  await q(
    db,
    `INSERT IGNORE INTO session (session_id, website_id, browser, os, device, screen, language, country, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sessionId,
    websiteId,
    browser,
    os,
    device,
    truncate(payload.screen, 11),
    truncate(payload.language, 35),
    null,
    createdAt,
  ).run();

  // Visit rotates hourly.
  const visitId = await idFrom(sessionId, hourSalt(now), 'visit');

  const page = parseUrl(payload.url, payload.hostname);
  const ref = parseReferrer(payload.referrer, payload.hostname);

  const eventName = typeof payload.name === 'string' ? payload.name : null;
  const eventType = eventName ? 2 : 1; // 1 = pageview, 2 = custom event

  const eventId = uuid();
  await run(
    db,
    `INSERT INTO website_event
      (event_id, website_id, session_id, visit_id, created_at, url_path, url_query,
       referrer_domain, referrer_path, referrer_query, page_title,
       event_type, event_name, hostname,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    eventId,
    websiteId,
    sessionId,
    visitId,
    createdAt,
    page.path,
    page.query,
    ref.domain,
    ref.path,
    ref.query,
    truncate(payload.title, 500),
    eventType,
    truncate(eventName, 50),
    truncate(payload.hostname, 100),
    page.utmSource,
    page.utmMedium,
    page.utmCampaign,
    page.utmContent,
    page.utmTerm,
    truncate(payload.tag, 50),
  );

  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data).slice(0, 20);
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      const str = typeof value === 'string' ? value : null;
      // Never store personal data in event properties.
      if (str && (SENSITIVE_KEY_RE.test(key) || EMAIL_VALUE_RE.test(str))) continue;
      await run(
        db,
        `INSERT INTO event_data
          (event_data_id, website_id, website_event_id, data_key, string_value, number_value, data_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        uuid(),
        websiteId,
        eventId,
        truncate(key, 500) ?? key,
        str ? truncate(str, 500) : null,
        typeof value === 'number' ? value : null,
        typeof value === 'number' ? 2 : 1,
        createdAt,
      );
    }
  }

  return Response.json({ ok: true });
}

export { all, first };
