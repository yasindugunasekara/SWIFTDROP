import { discardAuthSession, getAccessToken } from './auth';
import { getSupabaseClient } from './supabase';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
let refreshing: Promise<string | null> | null = null;

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

  if (response.status === 401 && token) {
    refreshing ||= (async () => {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.refreshSession();
      if (error || !data.session) return null;
      return data.session.access_token;
    })().finally(() => { refreshing = null; });
    const fresh = await refreshing;
    if (fresh) response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options,
      headers: { ...headers, Authorization: `Bearer ${fresh}` } });
  }

  if (!response.ok) {
    if (response.status === 401) discardAuthSession();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
