import type pg from 'pg';

/**
 * A minimal pg.Pool stand-in that runs SQL through the `swiftdrop_sql_bridge`
 * Postgres function via Supabase's HTTPS API (PostgREST RPC), authenticated with
 * the server-only secret key. Enabled with DATABASE_DRIVER=supabase.
 *
 * Supports db.query(text, values), db.query({ text, values }), db.connect() and
 * db.end(). Each statement runs in its own transaction: BEGIN / COMMIT / ROLLBACK
 * on a connected client are accepted but are no-ops, so multi-statement
 * transactions are not atomic in this mode (local development only).
 * Column values come back as JSON: timestamps are ISO strings and numeric/bigint
 * values are JSON numbers rather than pg's Date objects and numeric strings.
 */

const TRANSACTION_CONTROL = /^\s*(begin|commit|rollback|start\s+transaction|end)\s*;?\s*$/i;

function toPgArrayLiteral(values: unknown[]): string {
  const items = values.map((value) => {
    if (value === null || value === undefined) return 'NULL';
    if (Array.isArray(value)) return toPgArrayLiteral(value);
    const text = serializeParam(value) as string;
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  return `{${items.join(',')}}`;
}

function serializeParam(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `\\x${value.toString('hex')}`;
  if (Array.isArray(value)) return toPgArrayLiteral(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

class BridgeError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  constructor(message: string, code?: string, detail?: string, hint?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.detail = detail;
    this.hint = hint;
  }
}

export function createSupabaseBridgePool(supabaseUrl: string, secretKey: string): pg.Pool {
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/swiftdrop_sql_bridge`;

  async function query(textOrConfig: string | { text: string; values?: unknown[] }, values?: unknown[]) {
    const text = typeof textOrConfig === 'string' ? textOrConfig : textOrConfig.text;
    const params = (typeof textOrConfig === 'string' ? values : textOrConfig.values ?? values) ?? [];
    if (!supabaseUrl || !secretKey) {
      throw new BridgeError('DATABASE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SECRET_KEY in server/.env');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: text, params: params.map(serializeParam) }),
    });

    const body = await response.json().catch(() => null) as
      | { rows?: Record<string, unknown>[]; rowCount?: number; code?: string; message?: string; details?: string; hint?: string }
      | null;

    if (!response.ok || !body) {
      throw new BridgeError(body?.message || `Supabase SQL bridge failed with HTTP ${response.status}`,
        body?.code, body?.details ?? undefined, body?.hint ?? undefined);
    }

    const rows = body.rows ?? [];
    const fields = rows.length ? Object.keys(rows[0]).map((name) => ({ name })) : [];
    return { rows, rowCount: body.rowCount ?? rows.length, command: '', oid: 0, fields };
  }

  const client = {
    query: async (textOrConfig: string | { text: string; values?: unknown[] }, values?: unknown[]) => {
      const text = typeof textOrConfig === 'string' ? textOrConfig : textOrConfig.text;
      if (TRANSACTION_CONTROL.test(text)) return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
      return query(textOrConfig, values);
    },
    release: () => undefined,
  };

  const pool = {
    query,
    connect: async () => client,
    end: async () => undefined,
    on: () => pool,
  };

  console.log('✅ Database queries routed through the Supabase SQL bridge (DATABASE_DRIVER=supabase)');
  return pool as unknown as pg.Pool;
}
