import { API_URL, getMobileAccessToken, getMobileSessionRevision, isMobileSessionCurrent, logoutMobile, refreshMobileAccessToken } from './auth';

export async function mobileApiFetch(endpoint: string, options: RequestInit = {}) {
  const version = getMobileSessionRevision();
  const token = await getMobileAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const request = () => fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let response = await request();
  if (response.status === 401 && token && isMobileSessionCurrent(version)) {
    const fresh = await refreshMobileAccessToken(token);
    if (fresh && isMobileSessionCurrent(version)) {
      headers.set('Authorization', `Bearer ${fresh}`);
      response = await request();
    }
  }
  if (token && !isMobileSessionCurrent(version)) throw new Error('Your session has changed. Please try again.');

  if (!response.ok) {
    if (response.status === 401 && token) await logoutMobile();
    throw new Error(response.status === 401 ? 'Your session expired. Please sign in again.' : `Mobile request error: ${response.status}`);
  }

  return response.json();
}
