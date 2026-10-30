export type UserRole = 'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | 'MERCHANT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  merchantId?: string;
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('swiftdrop_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(user: User, accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('swiftdrop_user', JSON.stringify(user));
  localStorage.setItem('swiftdrop_access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('swiftdrop_refresh_token', refreshToken);
  }
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('swiftdrop_user');
  localStorage.removeItem('swiftdrop_access_token');
  localStorage.removeItem('swiftdrop_refresh_token');
}
