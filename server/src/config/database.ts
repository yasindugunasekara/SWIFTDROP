import pg from 'pg';
import { config } from './env.js';
import { createSupabaseBridgePool } from './supabase-sql-bridge.js';

const { Pool } = pg;

function createPgPool(): pg.Pool {
  const databaseUrl = new URL(config.databaseUrl);
  const supabaseHost = databaseUrl.hostname.endsWith('.supabase.co') || databaseUrl.hostname.endsWith('.supabase.com');
  if (supabaseHost) {
    for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) databaseUrl.searchParams.delete(option);
  }

  const pool = new Pool({
    connectionString: databaseUrl.toString(),
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5,
    ...(supabaseHost ? { ssl: { rejectUnauthorized: true,
      ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}) } } : {}),
  });

  pool.on('connect', () => {
    console.log('✅ PostgreSQL database connected successfully');
  });

  pool.on('error', () => {
    console.error('PostgreSQL connection error. Check the backend database configuration.');
  });

  return pool;
}

// This pool is for other members' business modules. Authentication uses Supabase's HTTPS API.
// DATABASE_DRIVER=supabase routes the same SQL through Supabase's HTTPS API using the
// server-only SUPABASE_SECRET_KEY, for developers without a direct PostgreSQL password.
export const db: pg.Pool = process.env.DATABASE_DRIVER === 'supabase'
  ? createSupabaseBridgePool(config.supabase.url, process.env.SUPABASE_SECRET_KEY || '')
  : createPgPool();
