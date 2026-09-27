// Admin auth: PBKDF2-SHA256 password check against env vars, HMAC-signed session cookie.
// Env: ADMIN_PASSWORD_HASH (hex of PBKDF2-SHA256(password, salt, 100k)), ADMIN_SALT (hex),
//      ADMIN_SECRET (random hex for cookie signing).

import { sha256Hex } from './util';

const te = new TextEncoder();

export interface Env {
  DB: any;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SALT?: string;
  ADMIN_SECRET?: string;
  [k: string]: any;
}

const SESSION_COOKIE = 'lite_session';
const SESSION_TTL = 7 * 24 * 3600; // 7 days

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    te.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(data));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2Hex(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key,
    256,
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function authConfigured(env: Env): boolean {
  return !!(env.ADMIN_PASSWORD_HASH && env.ADMIN_SALT && env.ADMIN_SECRET);
}

export async function verifyPassword(env: Env, password: string): Promise<boolean> {
  if (!authConfigured(env)) return false;
  const derived = await pbkdf2Hex(password, env.ADMIN_SALT!);
  return timingSafeEqual(derived, env.ADMIN_PASSWORD_HASH!);
}

export async function makeSession(env: Env): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const sig = await hmacHex(env.ADMIN_SECRET!, String(exp));
  return `${exp}.${sig}`;
}

export async function checkSession(env: Env, cookieHeader: string | null): Promise<boolean> {
  if (!authConfigured(env)) return false;
  const m = /(?:^|;\s*)lite_session=([^;]+)/.exec(cookieHeader ?? '');
  if (!m) return false;
  return checkSessionToken(env, decodeURIComponent(m[1]));
}

// Session token from cookie (primary) or ?s= query param (fallback for
// environments where Set-Cookie is stripped). The token itself is URL-safe
// (expiry + hex HMAC), but callers should still encode it when embedding.
export function getSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  const m = /(?:^|;\s*)lite_session=([^;]+)/.exec(cookieHeader ?? '');
  if (m) return decodeURIComponent(m[1]);
  try {
    const s = new URL(req.url).searchParams.get('s');
    return s || null;
  } catch {
    return null;
  }
}

export async function checkSessionToken(env: Env, token: string | null): Promise<boolean> {
  if (!authConfigured(env) || !token) return false;
  const [expStr, sig] = token.split('.');
  const exp = parseInt(expStr, 10);
  if (!expStr || !sig || Number.isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(env.ADMIN_SECRET!, expStr);
  return timingSafeEqual(sig, expected);
}

export function sessionCookie(value: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

export { sha256Hex };
