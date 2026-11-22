import type { Session } from '@supabase/supabase-js';
import { createSupabaseClient } from '../../config/supabase.js';
import { config } from '../../config/env.js';

export const roles = ['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER', 'ADMIN'] as const;
export type UserRole = typeof roles[number];
export interface AuthProfile {
  sessionExpiresAt?: number;
  id: string; authUserId: string; email: string; fullName: string; phone: string | null;
  role: UserRole; merchantId?: string; approvalStatus?: string;
  application?: { id: string; requestedRole: 'COURIER' | 'MERCHANT'; status: string; reviewNote: string | null };
}
export class AuthServiceError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export interface AuthSession {
  user: AuthProfile; accessToken: string; refreshToken: string; expiresAt: number | undefined;
}
export interface AuthGateway {
  register(input: { email: string; password: string; fullName: string; application?: { requestedRole: 'COURIER' | 'MERCHANT'; phone: string; address: string; vehicleType?: string; vehicleNumber?: string; companyName?: string; registrationNumber?: string } }): Promise<{ requiresEmailConfirmation: boolean }>;
  login(email: string, password: string): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  authenticate(accessToken: string): Promise<AuthProfile>;
  logout(accessToken: string): Promise<void>;
  google(idToken: string): Promise<AuthSession>;
  updateProfile(accessToken: string, input: { fullName: string; phone?: string | null }): Promise<AuthProfile>;
  requestPasswordReset(email: string): Promise<void>;
}

async function profileFor(accessToken: string, authUserId: string): Promise<AuthProfile> {
  const client = createSupabaseClient(accessToken);
  const activeSession = await client.rpc('is_current_session_active');
  if (activeSession.error) throw new AuthServiceError(503, 'SESSION_UNAVAILABLE', 'Unable to verify your session. Please retry.');
  if (activeSession.data !== true) throw new AuthServiceError(401, 'SESSION_EXPIRED', 'Session expired. Please sign in again.');
  const deadline = await client.rpc('current_session_expires_at');
  const sessionExpiresAt = Date.parse(deadline.data);
  if (deadline.error || !Number.isFinite(sessionExpiresAt)) throw new AuthServiceError(503, 'SESSION_UNAVAILABLE', 'Unable to verify your session. Please retry.');
  if (sessionExpiresAt <= Date.now()) throw new AuthServiceError(401, 'SESSION_EXPIRED', 'Session expired. Please sign in again.');
  const { data, error } = await client.from('users')
    .select('id,auth_user_id,email,full_name,phone,role,is_active').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw new AuthServiceError(503, 'PROFILE_UNAVAILABLE', 'Unable to load your account. Please retry.');
  if (!data || data.is_active !== true || !roles.includes(data.role)) {
    throw new AuthServiceError(403, 'ACCOUNT_UNAVAILABLE', 'Your account is unavailable. Contact SwiftDrop support.');
  }
  const profile: AuthProfile = { id: data.id, authUserId, email: data.email, fullName: data.full_name,
    phone: data.phone, role: data.role, sessionExpiresAt };
  const application = await client.from('account_applications')
    .select('id,requested_role,status,review_note').eq('auth_user_id', authUserId).maybeSingle();
  if (application.error) throw new AuthServiceError(503, 'PROFILE_UNAVAILABLE', 'Unable to load account approval status.');
  if (application.data) profile.application = { id: application.data.id, requestedRole: application.data.requested_role,
    status: application.data.status, reviewNote: application.data.review_note };
  if (profile.role === 'MERCHANT') {
    const merchant = await client.from('merchants').select('id,approval_status').eq('user_id', data.id).maybeSingle();
    if (merchant.error) throw new AuthServiceError(503, 'PROFILE_UNAVAILABLE', 'Unable to load your business account.');
    profile.merchantId = merchant.data?.id;
    profile.approvalStatus = merchant.data?.approval_status || 'PENDING';
  }
  return profile;
}

async function sessionResponse(session: Session | null): Promise<AuthSession> {
  if (!session) throw new AuthServiceError(401, 'SESSION_REQUIRED', 'Please sign in again.');
  return { user: await profileFor(session.access_token, session.user.id), accessToken: session.access_token,
    refreshToken: session.refresh_token, expiresAt: session.expires_at };
}

export const authGateway: AuthGateway = {
  async requestPasswordReset(email) {
    const { error } = await createSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${config.appUrl}/reset-password`,
    });
    // Never reveal whether an email belongs to an account.
    if (error && (error.status === 429 || !error.status || error.status >= 500)) {
      throw new AuthServiceError(error.status === 429 ? 429 : 503, 'RESET_UNAVAILABLE', 'Unable to send a reset email right now. Please retry later.');
    }
  },
  async register(input) {
    const { data, error } = await createSupabaseClient().auth.signUp({ email: input.email, password: input.password,
      options: { data: { full_name: input.fullName, ...(input.application ? { registration_application: input.application } : {}) }, emailRedirectTo: `${config.appUrl}/auth/callback` } });
    if (error) {
      if (error.status === 429) throw new AuthServiceError(429, 'RATE_LIMITED', 'Too many signup emails. Please wait and try again.');
      if (error.code === 'user_already_exists') throw new AuthServiceError(409, 'EMAIL_EXISTS', 'This account already exists. Please sign in.');
      if (error.code === 'weak_password' || error.code === 'email_address_invalid') {
        throw new AuthServiceError(400, 'VALIDATION_ERROR', 'Check your email address and password.');
      }
      throw new AuthServiceError(503, 'SIGNUP_UNAVAILABLE', 'Account creation is unavailable. Please try again shortly.');
    }
    // Supabase intentionally obscures some duplicate signups. Do not promise an account ID or login session here.
    return { requiresEmailConfirmation: !data.session };
  },
  async login(email, password) {
    const { data, error } = await createSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === 'email_not_confirmed') throw new AuthServiceError(403, 'EMAIL_NOT_CONFIRMED', 'Confirm your email before signing in.');
      if (error.status === 429) throw new AuthServiceError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Please try again later.');
      if (!error.status || error.status >= 500) throw new AuthServiceError(503, 'AUTH_UNAVAILABLE', 'Sign-in is temporarily unavailable.');
      throw new AuthServiceError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    return sessionResponse(data.session);
  },
  async refresh(refreshToken) {
    const { data, error } = await createSupabaseClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw new AuthServiceError(error.status && error.status < 500 ? 401 : 503, 'SESSION_EXPIRED', 'Session expired. Please sign in again.');
    return sessionResponse(data.session);
  },
  async authenticate(accessToken) {
    const { data, error } = await createSupabaseClient().auth.getUser(accessToken);
    if (error || !data.user) throw new AuthServiceError(error && (!error.status || error.status >= 500) ? 503 : 401,
      'INVALID_TOKEN', 'Invalid or expired session. Please sign in again.');
    return profileFor(accessToken, data.user.id);
  },
  async logout(accessToken) {
    const response = await fetch(`${config.supabase.url}/auth/v1/logout?scope=local`, { method: 'POST',
      headers: { apikey: config.supabase.anonKey, Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok && response.status !== 401) throw new AuthServiceError(503, 'LOGOUT_UNAVAILABLE', 'Unable to sign out. Please retry.');
  },
  async google(idToken) {
    const { data, error } = await createSupabaseClient().auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw new AuthServiceError(401, 'GOOGLE_AUTH_FAILED', 'Google sign-in failed. Please retry.');
    return sessionResponse(data.session);
  },
  async updateProfile(accessToken, input) {
    const profile = await this.authenticate(accessToken);
    const { error } = await createSupabaseClient(accessToken).from('users').update({ full_name: input.fullName,
      phone: input.phone || null, updated_at: new Date().toISOString() }).eq('auth_user_id', profile.authUserId);
    if (error) throw new AuthServiceError(400, 'PROFILE_UPDATE_FAILED', 'Unable to save your profile.');
    return this.authenticate(accessToken);
  },
};
