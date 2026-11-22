import { createSupabaseClient } from '../../config/supabase.js';
import { AuthServiceError } from './auth.service.js';

export async function listApplications(token: string, status: string) {
  const { data, error } = await createSupabaseClient(token).from('account_applications')
    .select('id,full_name,email,requested_role,details,status,review_note,created_at,reviewed_at')
    .eq('status', status).order('created_at', { ascending: true }).limit(100);
  if (error) throw new AuthServiceError(503, 'APPLICATIONS_UNAVAILABLE', 'Unable to load applications.');
  return data;
}

export async function reviewApplication(token: string, id: string, decision: string, note: string) {
  const { data, error } = await createSupabaseClient(token).rpc('review_account_application', {
    application_id: id, decision, review_note: note,
  });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === '23514' ? 409 : 503;
    throw new AuthServiceError(status, 'APPLICATION_REVIEW_FAILED', status === 409
      ? 'This application has already been reviewed or the account is not eligible. Refresh the list.'
      : status === 404 ? 'Application not found.' : status === 403 ? 'Staff approval access is required.' : 'Unable to review the application. Please retry.');
  }
  return data;
}
