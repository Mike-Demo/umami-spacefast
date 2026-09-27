# Lite Analytics

A tiny self-hosted web analytics service (tracker + dashboard) that runs as a
single SpaceFast Functions worker. No Next.js, no Prisma, zero npm
dependencies in the bundle (~24 KB — far under SpaceFast's 8 MB worker limit).

This is the pragmatic replacement for the full Umami port, whose Next.js
worker compiled to 25.9 MB and could not ship under the 8 MB cap.

## What it does

- **Tracker** — `POST /api/send` (alias `/api/collect`) accepts Umami tracker
  payloads (`{ type: 'event', payload }`). Also serves a minimal tracker script
  at `GET /tracker.js` (`window.lite.track(name, data)` for custom events).
- **Dashboard** — server-rendered pages: website list, per-website overview
  (pageviews, visitors, visits, bounce rate, online now, traffic chart, live
  feed, top pages, referrers, custom events, tracking snippet).
- **Auth** — single admin login. Password verified with PBKDF2-SHA256
  (100k iterations) against env vars; HMAC-signed httpOnly session cookie
  (7-day expiry).

Scope is intentionally **pageviews + events only**. No session replay, no
heatmaps, no distinct IDs.

## Deploy

1. Create a SpaceFast space (private) with a database:
   `sf.jsonc` in this directory declares
   `{"runtime":{"kind":"functions","database":true}}`.
2. Apply `schema.sql` in the space's SQL console.
3. Set env vars on the space (generate locally, never commit):
   ```sh
   openssl rand -hex 32   # -> ADMIN_SALT
   openssl rand -hex 32   # -> ADMIN_SECRET
   ADMIN_SALT=<salt> ADMIN_PASSWORD='<pick-a-strong-password>' node -e "
   const crypto = require('crypto');
   const salt = Buffer.from(process.env.ADMIN_SALT, 'hex');
   crypto.pbkdf2(process.env.ADMIN_PASSWORD, salt, 100000, 32, 'sha256',
     (e, dk) => console.log(dk.toString('hex')));"
   # -> ADMIN_PASSWORD_HASH
   ```
4. Build and publish from this directory:
   ```sh
   npm install && npm run build   # -> worker.js
   sf publish .                   # entry: worker.js
   ```
5. Sign in at the space URL, add a website, paste the tracking snippet.

## Tracking snippet

```html
<script defer src="https://<space>.view.fast/tracker.js" data-website-id="<uuid>"></script>
```

The official Umami `script.js` also works: point it at the space with
`data-host-url="https://<space>.view.fast"` — it posts to `/api/send` with the
same payload shape. CSP note for each site: allow `script-src` for the space
origin and `connect-src` for the space origin.

## Privacy

- **IP addresses are never stored.** Sessions derive from a salted SHA-256 of
  (website, IP, user-agent) with a **daily-rotating** salt; the IP itself is
  discarded after hashing.
- **Query strings are scrubbed** before storage: parameters named like
  `token`, `password`, `secret`, `api_key`, `auth`, `session`, `email`, … are
  dropped; values that look like email addresses are redacted.
- **Event properties** (`data` on custom events): keys/values matching the
  same sensitive patterns are dropped, never stored.
- **User-agents are never stored raw** — only a coarse browser/OS/device
  family is kept.
- **No cookies** are set by the tracker. Do-not-track is respected.
- **Bots** are filtered by user-agent and not recorded.

## Retention

Raw events, sessions and event data are kept **365 days** by default. To prune:

```sh
curl -X POST 'https://<space>.view.fast/api/admin/retention?days=365' \
  --cookie 'lite_session=<your-session-cookie>'
```

(There is no in-worker scheduler; run this periodically or lower `days`.)

## API

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| POST | /api/send, /api/collect | no | tracker payloads |
| GET | /tracker.js | no | tracker script |
| GET | /api/health | no | health check |
| GET/POST | /login | no | admin sign-in |
| GET | /logout | yes | sign out |
| GET | / | yes | website list |
| POST | /api/websites | yes | create website (form) |
| GET | /w/:id?range=24h\|7d\|30d | yes | dashboard |
| POST | /api/admin/retention?days=N | yes | prune old rows |

## Tests

`npm test` runs the harness in `test/harness.test.mjs`, which executes the
bundled worker against an in-memory fake of `env.DB`: auth, website creation,
collect (pageview + custom event), privacy scrubbing, bot filtering, dashboard
rendering, retention and logout.
