/**
 * Production-safe logger that hides raw database stack traces and credentials in production.
 */
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      const errDetail = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
      console.error(`[ERROR ${new Date().toISOString()}] ${message}${errDetail ? ` - ${errDetail}` : ''}`);
    }
  },
  warn: (message: string) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`);
    }
  },
  info: (message: string) => {
    if (isDev) {
      console.info(`[INFO] ${message}`);
    }
  },
};
