import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_password_example@localhost:5432/swiftdrop_db?schema=public'
});

async function runMigrations() {
  console.log('🚀 Starting SwiftDrop Database Migrations...');
  const client = await pool.connect().catch((err) => {
    console.warn('Unable to connect to PostgreSQL. Check DATABASE_URL.');
    console.log('💡 Note: You can also run the SQL scripts directly in Supabase SQL Editor:');
    console.log('   - server/src/database/migrations/001_initial_schema.sql');
    console.log('   - server/src/database/migrations/002_seed_sample_users.sql');
    return null;
  });

  if (!client) {
    await pool.end();
    process.exitCode=1;
    return;
  }

  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const requested=process.argv.indexOf('--only');
    const only=requested>=0?process.argv[requested+1]:undefined;
    const files = fs.readdirSync(migrationsDir).filter(file=>!only||file===only).sort();
    if(only&&!files.length)throw new Error('Requested migration not found');

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`📦 Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        console.log(`✅ Migration applied successfully: ${file}`);
      }
    }
    console.log('🎉 All migrations and seed credentials successfully applied!');
  } catch (error) {
    console.error('Migration failed. The database was not fully migrated.');
    process.exitCode=1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
