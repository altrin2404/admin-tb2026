import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerVerificationEmail } from '@/lib/email';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const registration = await prisma.registration.findUnique({
      where: { id },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (!registration.email || !registration.email.includes('@')) {
      return NextResponse.json({ error: 'Participant has no valid email address' }, { status: 400 });
    }

    const result = await triggerVerificationEmail(registration);

    return NextResponse.json({
      success: true,
      message: `Confirmation email dispatched to ${registration.email}`,
      result,
    });
  } catch (error) {
    console.error('Error dispatching email:', error);
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
  }
}
