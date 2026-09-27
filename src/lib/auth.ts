'use client';

export const PORTAL_PASSCODE = process.env.NEXT_PUBLIC_PORTAL_PASSCODE || '232425';

const STORAGE_KEY = 'tb_portal_unlocked';

export function isPortalAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === PORTAL_PASSCODE;
}

export function setPortalAuthenticated(code: string): boolean {
  if (code.trim() === PORTAL_PASSCODE) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, PORTAL_PASSCODE);
      document.cookie = `tb_portal_unlocked=${PORTAL_PASSCODE}; path=/; max-age=86400; SameSite=Lax`;
    }
    return true;
  }
  return false;
}

export function lockPortal(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
    document.cookie = 'tb_portal_unlocked=; path=/; max-age=0';
  }
}
