import assert from 'node:assert/strict';
import { createSupabaseClient, publicAuthConfig } from '../config/supabase.js';
import { authGateway, AuthServiceError } from '../modules/auth/auth.service.js';

try {
  const config = publicAuthConfig();
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.anonKey }, signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.ok, true, 'Supabase Auth API did not accept the configured public key');
  const settings = await response.json() as { external?: { email?: boolean; google?: boolean }; mailer_autoconfirm?: boolean };
  const anonymousRead = await createSupabaseClient().from('users').select('id').limit(1);
  assert.ok(anonymousRead.error, 'Public anonymous clients must not be able to list user profiles');
  console.log(JSON.stringify({ supabaseAuthConnected: true, emailSignupEnabled: settings.external?.email,
    googleEnabled: settings.external?.google, emailConfirmationRequired: !settings.mailer_autoconfirm,
    anonymousProfileReadsBlocked: true, databaseUrlRequiredForAuthentication: false }));
  if (process.env.AUTH_TEST_ACCESS_TOKEN) {
    const profile = await authGateway.authenticate(process.env.AUTH_TEST_ACCESS_TOKEN);
    console.log(JSON.stringify({ authenticatedProfileVerified: true, role: profile.role }));
  }
} catch (error) {
  if (error instanceof assert.AssertionError || error instanceof AuthServiceError) console.error(error.message);
  else console.error('Supabase Auth check failed. Check SUPABASE_URL, the publishable/anon key, and network access.');
  process.exitCode = 1;
}
