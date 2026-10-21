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
2. Create the tables. Either run `schema.sql` in the space's SQL console, or
   use the one-time migrate endpoint (recommended):
   ```sh
   # set a one-time token, then call the endpoint
   sf env set SETUP_TOKEN="$(openssl rand -hex 32)"
   sf publish .   # make sure the latest worker is live
   curl 'https://<space>.view.fast/api/admin/migrate?token=<SETUP_TOKEN>'
   sf env rm SETUP_TOKEN   # disable the endpoint afterwards
   ```
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
   Also generate a secret for the scheduled retention cron:
   ```sh
   openssl rand -hex 32   # -> CRON_SECRET
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

Raw events, sessions and event data are kept **365 days** by default. A
Spacefast cron (`sf.jsonc` → `crons`) calls `GET /api/cron/retention` daily;
the worker checks the request's `Authorization: Bearer <CRON_SECRET>` header
before pruning, so set `CRON_SECRET` as an env var for the schedule to work.

To prune manually:

```sh
curl -X POST 'https://<space>.view.fast/api/admin/retention?days=365' \
  --cookie 'lite_session=<your-session-cookie>'
```

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
| GET | /api/admin/migrate?token=… | SETUP_TOKEN | one-time schema setup |
| GET | /api/cron/retention | CRON_SECRET bearer | scheduled prune (daily) |

## Tests

`npm test` runs the harness in `test/harness.test.mjs`, which executes the
bundled worker against an in-memory fake of `env.DB`: auth, website creation,
collect (pageview + custom event), privacy scrubbing, bot filtering, dashboard
rendering, retention and logout.

## Security audit triage — 2026-10-21

Parent: [Mike-Demo/umami-spacefast#1](https://github.com/Mike-Demo/umami-spacefast/issues/1).
This is the fallback backlog because issue creation is unavailable in this
session. No child issues have been filed and no findings have been fixed.
Each **Title** and **Body** below is ready to copy into a separate issue.
The supplied audit used static source inspection only; no deployed endpoint
was probed. Deployment-dependent leads remain unconfirmed and have no severity.

### Priority and grouping

| Order | Severity | Finding | Risk, reachability, and fix size |
| ----- | -------- | ------- | ------------------------------- |
| 1 | medium | Admin token in URLs | A recipient of a copied dashboard URL or a reader of history/proxy logs gets a full admin credential. Remove URL transport across auth, redirects, and templates; verify edge cookie delivery. |
| 2 | medium | Sessions cannot be revoked | Requires possession of a token, but logout cannot stop its reuse for the remaining seven-day lifetime. Compounds #1; adding session state is a larger change. |
| 3 | low | Unscrubbed URL fragments | Normal tracker traffic can persist credentials from tracked pages; analytics readers can then see them. Dropping fragments in both parsers is a small, low-risk fix. |
| 4 | low | Numeric sensitive event properties | Public ingestion accepts sensitive numeric properties despite the privacy filter. An unconditional key check is a tiny, low-risk fix. |
| 5 | low | Arbitrary collect timestamps | An unauthenticated sender with a valid website ID can poison historical/realtime metrics and evade age-based pruning. Server receipt time is a small fix, with a deliberate client-time behavior change. |
| 6 | low | Enumerable visitor session IDs | Requires access to stored IDs, the website/date, and a candidate user agent, then offline IP enumeration. A dedicated keyed hash also needs secret provisioning and a session-ID transition. |

Severity and lower-trust reachability take precedence over fix size; the
numeric-key check is especially suitable for an early small patch. The six
findings have distinct root causes, so none are merged. URL transport and
non-revocation amplify one another but need separate fixes. The two privacy
filter bypasses share an ingestion area, not a root cause.

### Remediation issue 1

**Title:** `[security][medium] Remove admin session tokens from dashboard URLs`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

Fingerprint: `session-token-in-url-primary-transport`

Priority: 1 of 6 confirmed findings.

**Evidence:** `/home/runner/work/umami-spacefast/umami-spacefast/src/auth.ts:75-88`
accepts `?s=` after checking the cookie.
`/home/runner/work/umami-spacefast/umami-spacefast/src/worker.ts:79-80,153-167,185-191`
redirects to token-bearing URLs and calls them the primary transport.
`/home/runner/work/umami-spacefast/umami-spacefast/src/pages.ts:233-236,286-299,326,367,393-394`
propagates the credential through website links, form actions, ranges, site
selection, and navigation. A copied URL, browser history, or access/proxy log
can expose a credential accepted for full admin access.

**Root cause:** The admin bearer credential is accepted and propagated in URLs
instead of being restricted to the HttpOnly cookie.

**Smallest fix:** Remove the query fallback from `getSessionToken`, remove
`sq(token)` and token propagation from every dashboard link/form, and replace
all token-bearing redirects with clean URLs. Keep the secure HttpOnly cookie
as the only accepted transport. Resolve any SpaceFast edge `Set-Cookie`
stripping at the edge rather than reintroducing URL credentials.

**Acceptance criteria:**
- [ ] A valid token supplied only through `?s=` cannot authenticate.
- [ ] Login, website creation, navigation, site selection, range changes, and
      form actions neither emit nor require a session token in the URL.
- [ ] Cookie-based login and dashboard actions still work through the deployed
      edge; cookie security attributes remain intact.

### Remediation issue 2

**Title:** `[security][medium] Make admin sessions individually revocable on logout`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

Fingerprint: `session-token-unrevocable-expiry-only`

Priority: 2 of 6 confirmed findings. Related to URL-token exposure, but not
fixed by removing URL transport.

**Evidence:** `/home/runner/work/umami-spacefast/umami-spacefast/src/auth.ts:18,62-66,90-96`
constructs a seven-day expiry plus HMAC of that expiry alone, then validates
without session state. Tokens issued in the same second are identical.
`/home/runner/work/umami-spacefast/umami-spacefast/src/worker.ts:172-173`
only clears the cookie on logout. A copied token remains usable from another
browser until expiry, including when presented as a cookie.

**Root cause:** Tokens contain no random session identifier and validation
consults no revocable server-side record.

**Smallest fix:** Include a cryptographically random session ID generated with
`crypto.getRandomValues` in the signed token and store a corresponding active
session record. Have validation require that record and logout invalidate the
presented session before clearing the cookie. Use session records or a
server-side version to invalidate sessions on password changes; randomness
alone does not provide revocation.

**Acceptance criteria:**
- [ ] Two logins in the same second produce distinct signed session IDs.
- [ ] Replaying a logged-out token fails even from a different browser.
- [ ] Expired, tampered, unknown, revoked, and legacy expiry-only tokens fail.
- [ ] Password changes invalidate previous sessions; normal login and
      unaffected active sessions work under the chosen revocation policy.

### Remediation issue 3

**Title:** `[security][low] Drop URL fragments before storing analytics paths`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

Fingerprint: `privacy-scrub-bypass-url-fragment`

Priority: 3 of 6 confirmed findings.

**Evidence:** `/home/runner/work/umami-spacefast/umami-spacefast/src/collect.ts:36-42,62-75,160-165`
stores `pathname + hash` for page and referrer paths but scrubs only the search
component. `/home/runner/work/umami-spacefast/umami-spacefast/src/tracker.ts:21-29`
sends `location.href` (or a pathname still containing the hash).
Credential-bearing fragments can therefore be stored verbatim and exposed
to dashboard readers. Default retention is 365 days.

**Root cause:** Fragment content bypasses query-string privacy scrubbing in
both URL parsers.

**Smallest fix:** Store pathname only, dropping the fragment in both `parseUrl`
and `parseReferrer`. If fragment-based route analytics must be preserved,
explicitly design equivalent sensitive-key/email scrubbing for both parsers
instead; dropping fragments is the smaller, safer default.

**Acceptance criteria:**
- [ ] Page and referrer fragments containing credentials or emails are absent
      from stored paths, including when sent by the bundled tracker.
- [ ] Ordinary paths and existing query-string scrubbing still work.
- [ ] Document the loss of fragment-route detail; do not claim that this
      prospective fix removes previously stored sensitive data.

### Remediation issue 4

**Title:** `[security][low] Filter sensitive event-property keys for numeric values`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

Fingerprint: `event-data-numeric-sensitive-key-bypass`

Priority: 4 of 6 confirmed findings.

**Evidence:** `/home/runner/work/umami-spacefast/umami-spacefast/src/collect.ts:178-199`
sets `str` to null for numbers and guards both privacy tests with `if (str)`.
A sensitive key such as `token`, `password`, `secret`, `api_key`, `auth`,
`session`, or `email` thus retains its numeric value with `data_type=2`.
This contradicts the event-property privacy promise in
`/home/runner/work/umami-spacefast/umami-spacefast/README.md:77-81`.

**Root cause:** Sensitive-key filtering incorrectly depends on a truthy
string value instead of applying to every supported value type.

**Smallest fix:** Test `SENSITIVE_KEY_RE` unconditionally for each key before
the value-type branch. Apply the email-value test only to string values.

**Acceptance criteria:**
- [ ] Sensitive keys are dropped for numeric values (including zero), empty
      strings, and nonempty strings.
- [ ] Email-valued string properties remain excluded.
- [ ] Benign numeric and string properties retain their existing storage types.

### Remediation issue 5

**Title:** `[security][low] Bound collect timestamps to server receipt time`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

Fingerprint: `collect-arbitrary-timestamp-poisoning`

Priority: 5 of 6 confirmed findings.

**Evidence:** `/home/runner/work/umami-spacefast/umami-spacefast/src/collect.ts:110-116,125-135,150-160,189-199`
accepts client timestamps with only a NaN check and uses them for all three
insert types. `/home/runner/work/umami-spacefast/umami-spacefast/src/pages.ts:140-150`
uses lower-bound-only realtime queries, while
`/home/runner/work/umami-spacefast/umami-spacefast/src/worker.ts:50-56`
prunes rows older than a cutoff. A public sender with a valid website ID can
insert future rows that evade pruning and enter realtime results, or past
rows that distort historical windows.

**Root cause:** Unauthenticated client time is trusted as stored `created_at`
without a plausible bound around server receipt time.

**Smallest fix:** Use server receipt time for all collect inserts. If client
time is required, accept it only within a documented small window (for example
one hour), otherwise substitute receipt time. Use the same selected time for
session, website-event, and event-data inserts.

**Acceptance criteria:**
- [ ] Far-past and far-future timestamps cannot set arbitrary stored dates.
- [ ] Missing, malformed, and boundary timestamps follow the documented policy.
- [ ] All three insert types use the selected timestamp consistently and
      normal collection, realtime queries, and retention still work.

### Remediation issue 6

**Title:** `[security][low] Key visitor session hashes with a dedicated secret`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

Fingerprint: `predictable-visitor-session-id-ip-reversal`

Priority: 6 of 6 confirmed findings.

**Evidence:** `/home/runner/work/umami-spacefast/umami-spacefast/src/util.ts:5-14,96-98`
uses plain SHA-256 over joined inputs and a public UTC date string.
`/home/runner/work/umami-spacefast/umami-spacefast/src/collect.ts:118-122`
supplies the website ID, raw client IP, raw user agent, and date.
Despite the salted-hash wording in
`/home/runner/work/umami-spacefast/umami-spacefast/README.md:74-76`,
no secret participates. A holder of stored IDs can enumerate candidate IPv4
addresses for a known website/date and candidate user agent to recover a
matching visitor IP and confirm the visit.

**Root cause:** Session IDs use an unkeyed hash of known or enumerable inputs;
the daily date is rotation context, not a secret salt.

**Smallest fix:** Derive visitor session IDs using HMAC-SHA256 with a dedicated
server secret such as `SESSION_HASH_SECRET`, retaining the date in the input
for daily rotation and the database-compatible ID shape. Provision the secret
outside source control, document setup/rotation and the ID transition, and do
not silently fall back to the old unkeyed derivation if configuration is missing.
Avoid changing unrelated uses of `idFrom`.

**Acceptance criteria:**
- [ ] Identical inputs with the same secret/date are stable; changing the
      secret or day changes the session ID.
- [ ] Public inputs alone cannot reproduce new stored IDs; raw IPs and user
      agents remain unstored.
- [ ] Missing-secret behavior and deployment provisioning are tested and
      documented; existing stored IDs are not claimed to be retroactively protected.

### Validation checklist issue

**Title:** `[security][needs-validation] Audit leads to validate`

**Body:**

Parent: https://github.com/Mike-Demo/umami-spacefast/issues/1

These are unconfirmed leads, not confirmed findings. No severity is assigned.
The owner must collect deployment facts before deciding whether remediation
issues are warranted. Do not interpret absent source controls as proof that
edge/platform controls are absent.

- [ ] **POST /login has no in-source throttling against online guessing of the single admin password**
  - Fingerprint: `login-no-throttling-needs-validation`
  - Claimed root cause: Neither worker source nor `sf.jsonc` declares throttling;
    the single admin password gate may allow unlimited online guesses if no
    edge protection applies.
  - Source context: `/home/runner/work/umami-spacefast/umami-spacefast/src/worker.ts:153-170`
    and `/home/runner/work/umami-spacefast/umami-spacefast/sf.jsonc:1`.
  - **Exact missing fact:** Whether the SpaceFast edge for this space imposes any per-IP (or equivalent) rate limiting / WAF rule on POST /login in the actual deployment — owner must check the space's SpaceFast rate-limit/WAF settings; no such configuration exists in the repo (sf.jsonc included).
  - Record the applicable rule, scope, and enforcement evidence, or its absence.

- [ ] **Unauthenticated collect inserts rows with no in-source body-size, rate, or quota bound**
  - Fingerprint: `unauthenticated-collect-storage-exhaustion-needs-validation`
  - Claimed root cause: Public ingestion may be unbounded if no platform cap
    binds first; worker source and `sf.jsonc` declare no body-size, rate, or quota bound.
  - Source context: `/home/runner/work/umami-spacefast/umami-spacefast/src/collect.ts:81-103,123-202`
    and `/home/runner/work/umami-spacefast/umami-spacefast/sf.jsonc:1`.
  - **Exact missing fact:** The SpaceFast platform limits for this space: maximum request body size, any per-IP/per-space request rate limit, and the database storage quota/pricing that would bind first — owner must confirm these from SpaceFast for the space; none is declared in sf.jsonc or src/.
  - Record all applicable limits and which binds first, including cost exposure.

- [ ] **clientIp falls back to caller-controlled x-forwarded-for, which feeds visitor session derivation**
  - Fingerprint: `xff-spoofable-visitor-session-derivation-needs-validation`
  - Claimed root cause: When `cf-connecting-ip` is absent, session derivation
    may use a forgeable forwarding header unless the edge neutralizes it.
  - Source context: `/home/runner/work/umami-spacefast/umami-spacefast/src/util.ts:63-68`
    and `/home/runner/work/umami-spacefast/umami-spacefast/src/collect.ts:118-122`.
  - **Exact missing fact:** SpaceFast edge behaviour for this deployment: whether it always sets cf-connecting-ip on requests to the worker and whether it strips or overwrites inbound x-forwarded-for when cf-connecting-ip is absent — owner should verify with a header-echo check on the space or SpaceFast documentation for the space.
  - Record documentation or owner-authorized header-echo results for both
    header-presence cases; no deployed probe was performed for this triage.

For each checkbox, attach deployment-specific evidence, then record whether
the lead is confirmed, mitigated, or still unknown. If confirmed, open a
separate remediation issue linked to the parent and assign severity only then.
