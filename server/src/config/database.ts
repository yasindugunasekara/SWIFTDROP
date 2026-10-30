import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.databaseUrl,
});

db.on('connect', () => {
  console.log('✅ PostgreSQL database connected successfully');
});

db.on('error', (err) => {
  console.error('❌ PostgreSQL database connection error:', err);
});
