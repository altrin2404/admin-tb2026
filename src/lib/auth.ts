'use client';

const STORAGE_KEY = 'tb_portal_unlocked';

/**
 * Checks local fast state (synchronous for initial client renders)
 */
export function isPortalAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Validates session against the server's signed HTTP-only cookie
 */
export async function checkServerSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/auth/check', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    const data = await res.json();
    if (data.authenticated) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      return true;
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Authenticates with the server using the entered passcode
 */
export async function setPortalAuthenticated(code: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: code.trim() }),
    });

    if (res.ok) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Logs out and clears the server-side cookie and local storage
 */
export async function lockPortal(): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
  } catch {
    // Ignore network errors on logout
  }
}
