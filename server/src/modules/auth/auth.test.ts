import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { createAuthRouter } from './auth.routes.js';
import { AuthServiceError, type AuthGateway, type AuthProfile } from './auth.service.js';
import { requireRoles } from '../../middleware/rbac.js';
import { createAuthenticationMiddleware } from '../../middleware/auth.js';
import { errorHandler } from '../../middleware/error-handler.js';

const profile: AuthProfile = { id: '11111111-1111-4111-8111-111111111111', authUserId: '22222222-2222-4222-8222-222222222222',
  email: 'customer@example.com', fullName: 'Customer', phone: null, role: 'CUSTOMER' };
const input = { fullName: '  Customer Name  ', email: ' Customer@Example.com ', password: 'Customer password 123', confirmPassword: 'Customer password 123', role: 'CUSTOMER' };
const session = { user: profile, accessToken: 'supabase-access', refreshToken: 'supabase-refresh', expiresAt: 9999999999 };
const gateway: AuthGateway = {
  async register() { return { requiresEmailConfirmation: true }; },
  async login(email, password) {
    if (email !== profile.email || password !== input.password) throw new AuthServiceError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    return session;
  },
  async refresh(token) {
    if (token !== 'supabase-refresh') throw new AuthServiceError(401, 'SESSION_EXPIRED', 'Session expired.');
    return session;
  },
  async authenticate(token) {
    if (token !== 'supabase-access') throw new AuthServiceError(401, 'INVALID_TOKEN', 'Invalid or expired session.');
    return profile;
  },
  async logout() {}, async google() { return session; }, async updateProfile() { return profile; },
};
const servers: Server[] = [];
let database: PGlite;

before(async () => {
  database = new PGlite();
  await database.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,raw_user_meta_data JSONB DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE SQL STABLE AS
      'SELECT coalesce(nullif(current_setting(''request.jwt.claims'',true),''''),''{}'')::jsonb';
    CREATE TABLE auth.sessions(id UUID PRIMARY KEY,user_id UUID REFERENCES auth.users(id),not_after TIMESTAMPTZ);
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE TYPE public.user_role AS ENUM ('CUSTOMER','COURIER','MERCHANT','DISPATCHER','ADMIN');
    CREATE TABLE public.users(id UUID PRIMARY KEY,email VARCHAR(255) UNIQUE NOT NULL,password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150) NOT NULL,phone VARCHAR(30),role user_role NOT NULL DEFAULT 'CUSTOMER',
      is_active BOOLEAN DEFAULT true,created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE public.merchants(id UUID PRIMARY KEY,user_id UUID REFERENCES public.users(id),approval_status TEXT);
    INSERT INTO public.users(id,email,password_hash,full_name,role)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy@example.com','legacy-hash','Legacy Courier','COURIER');`);
  const migration = await readFile(new URL('../../database/migrations/20261113164606_use_supabase_auth.sql', import.meta.url), 'utf8');
  await database.exec(migration);
  // Reapply each migration in runner order, including the later session grants.
  await database.exec(migration);
  const sessionMigration = await readFile(new URL('../../database/migrations/20261113174333_enforce_active_auth_sessions.sql', import.meta.url), 'utf8');
  await database.exec(sessionMigration);
  await database.exec(sessionMigration);
});
after(async () => {
  await Promise.all(servers.map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
  await database.close();
});

async function app(overrides: Partial<AuthGateway> = {}) {
  const provider = { ...gateway, ...overrides };
  const api = express(); api.use(express.json({ limit: '16kb' }));
  api.use('/api/v1/auth', createAuthRouter(provider));
  api.get('/staff', createAuthenticationMiddleware(provider), requireRoles(['DISPATCHER', 'ADMIN']), (_req, res) => res.json({ ok: true }));
  api.use(errorHandler);
  const server = api.listen(0, '127.0.0.1'); servers.push(server); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return async (path: string, body?: unknown, token?: string, raw = false) => {
    const response = await fetch(url + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: raw ? String(body) : JSON.stringify(body) }) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
}

test('signup validates and forwards normalized credentials to Supabase, without returning credentials or fake sessions', async () => {
  let called = false;
  const request = await app({ async register(value) { called = true; assert.equal(value.fullName, 'Customer Name'); assert.equal(value.email, profile.email); return { requiresEmailConfirmation: true }; } });
  const result = await request('/api/v1/auth/register', input);
  assert.equal(result.status, 202); assert.equal(called, true);
  assert.equal(result.body.requiresEmailConfirmation, true);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal('password' in result.body, false); assert.equal('accessToken' in result.body, false);
});
test('handles projects without email confirmation', async () => {
  const request = await app({ async register() { return { requiresEmailConfirmation: false }; } });
  assert.equal((await request('/api/v1/auth/register', input)).status, 201);
});
test('invalid input and privileged roles are rejected before calling Supabase', async () => {
  let calls = 0;
  const request = await app({ async register() { calls++; return { requiresEmailConfirmation: true }; } });
  for (const change of [{ fullName: '' }, { email: 'invalid' }, { password: 'short' },
    { confirmPassword: 'different' }, { password: '🙂'.repeat(20), confirmPassword: '🙂'.repeat(20) },
    { role: 'ADMIN' }, { role: 'COURIER' }, { password_hash: 'injected' }, { fullName: 'bad\u0000name' }]) {
    assert.equal((await request('/api/v1/auth/register', { ...input, ...change })).status, 400);
  }
  assert.equal(calls, 0);
});
test('login succeeds only for valid credentials; selected role cannot be submitted', async () => {
  const request = await app();
  assert.equal((await request('/api/v1/auth/login', { email: profile.email, password: input.password })).status, 200);
  assert.equal((await request('/api/v1/auth/login', { email: profile.email, password: 'wrong' })).status, 401);
  assert.equal((await request('/api/v1/auth/login', { email: profile.email, password: input.password, role: 'ADMIN' })).status, 400);
});
test('token verification, current profile, refresh and role checks are enforced', async () => {
  const request = await app();
  assert.equal((await request('/api/v1/auth/me')).status, 401);
  assert.equal((await request('/api/v1/auth/me', undefined, 'expired')).status, 401);
  const me = await request('/api/v1/auth/me', undefined, 'supabase-access');
  assert.equal(me.status, 200); assert.equal(me.body.user.role, 'CUSTOMER');
  assert.equal((await request('/staff', undefined, 'supabase-access')).status, 403);
  assert.equal((await request('/api/v1/auth/refresh', { refreshToken: 'supabase-refresh' })).status, 200);
  assert.equal((await request('/api/v1/auth/refresh', { refreshToken: 'expired' })).status, 401);
});
test('logout calls Supabase with a verified access token', async () => {
  let loggedOut = false;
  const request = await app({ async logout(token) { assert.equal(token, 'supabase-access'); loggedOut = true; } });
  assert.equal((await request('/api/v1/auth/logout', {}, 'supabase-access')).status, 200);
  assert.equal(loggedOut, true);
});
test('provider errors never leak submitted passwords or internal error details', async () => {
  const request = await app({ async register() { throw new Error('private database details'); } });
  const result = await request('/api/v1/auth/register', input);
  assert.equal(result.status, 503); assert.equal(JSON.stringify(result.body).includes('private'), false);
  assert.equal(JSON.stringify(result.body).includes(input.password), false);
});
test('malformed bodies, large bodies, and signup abuse are handled', async () => {
  const request = await app();
  assert.equal((await request('/api/v1/auth/register', '{broken', undefined, true)).status, 400);
  assert.equal((await request('/api/v1/auth/register', { value: 'x'.repeat(17000) })).status, 413);
  for (let index = 0; index < 10; index++) assert.equal((await request('/api/v1/auth/register', {})).status, 400);
  assert.equal((await request('/api/v1/auth/register', {})).status, 429);
});

const firstId = '33333333-3333-4333-8333-333333333333';
const secondId = '44444444-4444-4444-8444-444444444444';
test('Auth migration creates customer profiles, ignores user-editable roles, and does not copy passwords', async () => {
  await database.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1::uuid,$2,$3::jsonb)`,
    [firstId, 'first@example.com', JSON.stringify({ full_name: 'First Customer', role: 'ADMIN' })]);
  await database.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1::uuid,$2,$3::jsonb)`,
    [secondId, 'second@example.com', JSON.stringify({ full_name: 'Second Customer' })]);
  const { rows: [saved] } = await database.query<{ id: string; auth_user_id: string; password_hash: string | null; role: string }>(
    'SELECT id,auth_user_id,password_hash,role FROM public.users WHERE id=$1::uuid', [firstId]);
  assert.equal(saved.id, firstId); assert.equal(saved.auth_user_id, firstId);
  assert.equal(saved.role, 'CUSTOMER'); assert.equal(saved.password_hash, null);
});
test('legacy profile IDs and roles remain intact; matching emails cannot claim a legacy courier', async () => {
  await assert.rejects(database.query('INSERT INTO auth.users(id,email) VALUES ($1::uuid,$2)',
    ['55555555-5555-4555-8555-555555555555', 'LEGACY@example.com']));
  const { rows: [legacy] } = await database.query<{ role: string; auth_user_id: string | null }>("SELECT role,auth_user_id FROM public.users WHERE email='legacy@example.com'");
  assert.equal(legacy.role, 'COURIER'); assert.equal(legacy.auth_user_id, null);
});
test('RLS allows only own profile reads and safe updates; role escalation and password reads fail', async () => {
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [firstId]);
  await database.exec('SET ROLE authenticated');
  try {
    const { rows } = await database.query<{ id: string }>('SELECT id FROM public.users');
    assert.deepEqual(rows.map(row => row.id), [firstId]);
    await database.query('UPDATE public.users SET full_name=$1 WHERE id=$2::uuid', ['Updated Customer', firstId]);
    await assert.rejects(database.query("UPDATE public.users SET role='ADMIN' WHERE id=$1::uuid", [firstId]));
    await assert.rejects(database.query('SELECT password_hash FROM public.users'));
    await assert.rejects(database.query('UPDATE public.users SET auth_user_id=$1::uuid WHERE id=$2::uuid', [secondId, firstId]));
  } finally { await database.exec('RESET ROLE'); }
});

test('session check rejects missing, expired, revoked and another user session without exposing session records', async () => {
  const own = '66666666-6666-4666-8666-666666666666';
  const other = '77777777-7777-4777-8777-777777777777';
  await database.query('INSERT INTO auth.sessions(id,user_id) VALUES ($1::uuid,$2::uuid),($3::uuid,$4::uuid)', [own, firstId, other, secondId]);
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [firstId]);
  const check = async (id: string | null) => {
    await database.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify(id ? { session_id: id } : {})]);
    await database.exec('SET ROLE authenticated');
    try {
      await assert.rejects(database.query('SELECT * FROM auth.sessions'));
      const { rows: [value] } = await database.query<{ active: boolean }>('SELECT public.is_current_session_active() AS active');
      return value.active;
    } finally { await database.exec('RESET ROLE'); }
  };
  assert.equal(await check(own), true);
  assert.equal(await check(other), false);
  assert.equal(await check(null), false);
  await database.query("UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=$1::uuid", [own]);
  assert.equal(await check(own), false);
  await database.query('DELETE FROM auth.sessions WHERE id=$1::uuid', [own]);
  assert.equal(await check(own), false);
  await database.exec('SET ROLE anon');
  try { await assert.rejects(database.query('SELECT public.is_current_session_active()')); }
  finally { await database.exec('RESET ROLE'); }
});


test('courier and business signup requests preserve details without granting an operational role', async () => {
  for (const application of [
    { role: 'COURIER', phone: '0771234567', address: 'Colombo', vehicleType: 'Motorcycle', vehicleNumber: 'ABC-1234' },
    { role: 'MERCHANT', phone: '0771234567', address: 'Colombo business address', companyName: 'Test Business', registrationNumber: 'BR-1234' },
  ]) {
    let saved: Parameters<AuthGateway['register']>[0] | undefined;
    const request = await app({ async register(value) { saved = value; return { requiresEmailConfirmation: true }; } });
    const { role: ignored, ...credentials } = input;
    const result = await request('/api/v1/auth/register-application', { ...credentials, application });
    assert.equal(result.status, 202);
    assert.equal(result.body.requiresApproval, true);
    assert.equal(saved?.application?.requestedRole, application.role);
    assert.equal(saved?.application?.phone, application.phone);
    assert.equal(result.body.accessToken, undefined);
    assert.equal((saved as unknown as Record<string, unknown>).role, undefined);
  }
});

test('applications reject missing role details and privileged role requests before signup', async () => {
  let called = false;
  const request = await app({ async register() { called = true; return { requiresEmailConfirmation: true }; } });
  const { role: ignored, ...credentials } = input;
  for (const application of [
    { role: 'ADMIN' }, { role: 'COURIER', phone: '0771234567', address: 'Colombo', vehicleType: 'Motorcycle' },
    { role: 'MERCHANT', phone: '0771234567', address: 'Colombo' },
  ]) assert.equal((await request('/api/v1/auth/register-application', { ...credentials, application })).status, 400);
  assert.equal(called, false);
});
