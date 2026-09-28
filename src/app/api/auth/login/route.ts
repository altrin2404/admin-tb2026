import { NextResponse } from 'next/server';
import {
  getPasscode,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const passcode = body.passcode?.toString().trim();

    const expectedPasscode = getPasscode().trim();

    if (!passcode || passcode !== expectedPasscode) {
      return NextResponse.json(
        { success: false, error: 'Incorrect passcode. Access denied.' },
        { status: 401 }
      );
    }

    const token = createSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    // Set secure, HTTP-only signed session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
