import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'tb_portal_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

function getSecretKey(): string {
  return (
    process.env.PORTAL_SESSION_SECRET ||
    process.env.PORTAL_PASSCODE ||
    'tb2026-portal-secure-salt-sxcce-it-dept'
  );
}

export function getPasscode(): string {
  return process.env.PORTAL_PASSCODE || '232425';
}

/**
 * Creates a signed session token: timestamp.signature
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getSecretKey();
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`session:${timestamp}`)
    .digest('hex');
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies if a given session token is authentic and within validity window
 */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, receivedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  // Valid within 24 hours, and reject timestamps in the future beyond 1 minute clock drift
  if (now - timestamp > SESSION_MAX_AGE_SECONDS * 1000 || timestamp > now + 60000) {
    return false;
  }

  const secret = getSecretKey();
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(`session:${timestampStr}`)
    .digest('hex');

  try {
    const receivedBuffer = Buffer.from(receivedHmac, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
