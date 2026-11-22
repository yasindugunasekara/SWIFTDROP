import { config } from '../config/env.js';
import { publicAuthConfig } from '../config/supabase.js';
import { authGateway, AuthServiceError } from '../modules/auth/auth.service.js';

// Read-only setup check, except for short-lived demo sessions which are revoked.
// Prints no keys, passwords or tokens. Run from server/.
async function main() {
  const { url, anonKey } = publicAuthConfig();
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Auth settings request failed (${response.status}).`);
  const settings = await response.json() as { external?: { google?: boolean }; mailer_autoconfirm?: boolean };
  console.log(JSON.stringify({ googleProviderEnabled: settings.external?.google === true,
    emailConfirmationRequired: settings.mailer_autoconfirm === false,
    demoButtonsEnabled: config.authDemoEnabled,
    webCallback: `${config.appUrl}/auth/callback`, passwordResetCallback: `${config.appUrl}/reset-password`,
    nativeCallback: 'swiftdrop://auth/callback' }, null, 2));
  if (!process.argv.includes('--demo')) return;
  for (const role of ['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER'] as const) {
    const session = await authGateway.login(`${role.toLowerCase()}@swiftdrop.com`, config.demoPasswords[role]);
    try {
      if (session.user.role !== role) throw new Error(`${role}: incorrect provisioned role.`);
      const verified = await authGateway.authenticate(session.accessToken);
      if (verified.id !== session.user.id) throw new Error(`${role}: profile mismatch.`);
    } finally { await authGateway.logout(session.accessToken); }
    try { await authGateway.authenticate(session.accessToken); throw new Error(`${role}: logout did not revoke the session.`); }
    catch (error) { if (!(error instanceof AuthServiceError) || error.status !== 401) throw error; }
    console.log(`${role}: live login, profile verification and logout revocation passed.`);
  }
}
main().catch(error => { console.error(error instanceof AuthServiceError ? `${error.code}: ${error.message}` : error instanceof Error ? error.message : 'Auth setup check failed.'); process.exitCode = 1; });
