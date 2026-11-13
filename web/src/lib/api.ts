import { clearAuthSession, discardAuthSession, getAccessToken, getSessionRevision, isSessionCurrent, refreshAccessToken } from './auth';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Existing dashboard callers supply heterogeneous response shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const version = getSessionRevision();
  const token = typeof window !== 'undefined' ? await getAccessToken() : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token && isSessionCurrent(version)) {
    const fresh = await refreshAccessToken(token);
    if (fresh && isSessionCurrent(version)) response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options,
      headers: { ...headers, Authorization: `Bearer ${fresh}` } });
  }

  if (token && !isSessionCurrent(version)) throw new Error('Your session has changed. Please try again.');

  if (!response.ok) {
    if (response.status === 401 && token) await clearAuthSession().catch(() => discardAuthSession());
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
