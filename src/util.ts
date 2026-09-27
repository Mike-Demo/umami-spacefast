// Shared utilities: hashing, ids, cookies, HTML escaping.

const te = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', te.encode(input));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Deterministic UUID-shaped id from arbitrary parts (v4 layout, not RFC v5). */
export async function idFrom(...parts: string[]): Promise<string> {
  const h = await sha256Hex(parts.join('|'));
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function uuid(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function truncate(s: string | undefined | null, n: number): string | null {
  if (s === undefined || s === null) return null;
  return s.length > n ? s.slice(0, n) : s;
}

export function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isUuid(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

const BOT_RE =
  /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sohu|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claudebot|ccbot|anthropic|applebot|bingpreview|duckduckbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora|pinterest|redditbot|tumblr|twitterbot|facebookexternalhit/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !!userAgent && BOT_RE.test(userAgent);
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

/** Tiny UA family parser — stores families, never the raw UA string. */
export function parseClient(
  ua: string | undefined | null,
): { browser: string | null; os: string | null; device: string | null } {
  if (!ua) return { browser: null, os: null, device: null };
  const u = ua.toLowerCase();
  let browser: string | null = null;
  if (u.includes('edg/')) browser = 'edge';
  else if (u.includes('opr/') || u.includes('opera')) browser = 'opera';
  else if (u.includes('firefox')) browser = 'firefox';
  else if (u.includes('chrome')) browser = 'chrome';
  else if (u.includes('safari')) browser = 'safari';
  let os: string | null = null;
  if (u.includes('windows')) os = 'windows';
  else if (u.includes('mac os')) os = 'mac';
  else if (u.includes('android')) os = 'android';
  else if (u.includes('iphone') || u.includes('ipad')) os = 'ios';
  else if (u.includes('linux')) os = 'linux';
  let device: string | null = null;
  if (u.includes('mobile') || u.includes('iphone') || u.includes('android')) device = 'mobile';
  else if (u.includes('tablet') || u.includes('ipad')) device = 'tablet';
  else device = 'desktop';
  return { browser, os, device };
}

export function daySalt(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function hourSalt(d: Date): string {
  return `${daySalt(d)}T${pad2(d.getUTCHours())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
