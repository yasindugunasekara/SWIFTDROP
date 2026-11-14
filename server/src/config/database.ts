import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

const databaseUrl = new URL(config.databaseUrl);
const supabaseHost = databaseUrl.hostname.endsWith('.supabase.co') || databaseUrl.hostname.endsWith('.supabase.com');
if (supabaseHost) {
  for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) databaseUrl.searchParams.delete(option);
}

export const db = new Pool({
  connectionString: databaseUrl.toString(),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5,
  ...(supabaseHost ? { ssl: { rejectUnauthorized: true,
    ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}) } } : {}),
});

// This pool is for other members' business modules. Authentication uses Supabase's HTTPS API.

db.on('connect', () => {
  console.log('✅ PostgreSQL database connected successfully');
});

db.on('error', () => {
  console.error('PostgreSQL connection error. Check the backend database configuration.');
});
