// Minimal wrapper around SpaceFast's env.DB (D1-shaped API over MariaDB).
// Value mapping: Date -> 'YYYY-MM-DD HH:MM:SS' (UTC), boolean -> 0/1, undefined -> null.

export interface DbStatement {
  bind(...params: unknown[]): DbResult;
  all(): Promise<{ results: Record<string, any>[] }>;
  first(): Promise<Record<string, any> | null>;
  run(): Promise<{ meta?: any }>;
}

export interface DbResult {
  all(): Promise<{ results: Record<string, any>[] }>;
  first(): Promise<Record<string, any> | null>;
  run(): Promise<{ meta?: any }>;
}

export interface SpacefastDb {
  prepare(sql: string): DbStatement;
  exec(sql: string): Promise<unknown>;
}

function pad(n: number, z = 2): string {
  return String(n).padStart(z, '0');
}

export function toDbValue(v: unknown): unknown {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) {
    return (
      `${pad(v.getUTCFullYear(), 4)}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ` +
      `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`
    );
  }
  return v;
}

export function q(db: SpacefastDb, sql: string, ...params: unknown[]): DbResult {
  const mapped = params.map(toDbValue);
  return db.prepare(sql).bind(...mapped);
}

export async function all(
  db: SpacefastDb,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, any>[]> {
  const res = await q(db, sql, ...params).all();
  return res.results ?? [];
}

export async function first(
  db: SpacefastDb,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, any> | null> {
  const res = await q(db, sql, ...params).first();
  return res ?? null;
}

export async function run(
  db: SpacefastDb,
  sql: string,
  ...params: unknown[]
): Promise<void> {
  await q(db, sql, ...params).run();
}
