import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import { db } from '../config/database.js';

// Explicit operator-only bootstrap. Never expose this through an HTTP route.
async function seed() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!email || !password || password.length < 16 || !secret) {
    throw new Error('Set ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD (16+ characters), and SUPABASE_SECRET_KEY.');
  }
  const existing = await db.query('SELECT role, auth_user_id FROM users WHERE lower(email)=$1', [email]);
  if (existing.rows.length) {
    if (existing.rows[0].role !== 'ADMIN' || !existing.rows[0].auth_user_id) throw new Error('Existing account requires manual review; refusing to elevate or overwrite it.');
    console.log('Admin already exists; password unchanged.');
    return;
  }
  const client = createClient(config.supabase.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name: process.env.ADMIN_SEED_NAME || 'SwiftDrop Administrator' } });
  if (error || !data.user) throw new Error('Unable to create admin identity. Check Auth configuration.');
  try {
    const result = await db.query("UPDATE users SET role='ADMIN', updated_at=now() WHERE auth_user_id=$1 AND role='CUSTOMER' RETURNING id", [data.user.id]);
    if (result.rowCount !== 1) throw new Error('Admin profile was not provisioned.');
  } catch (error) {
    const cleanup = await client.auth.admin.deleteUser(data.user.id);
    if (cleanup.error) console.error('Bootstrap cleanup failed; inspect the newly created identity.');
    throw error;
  }
  console.log('Admin account created. Sign in through the standard web login.');
}
seed().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
