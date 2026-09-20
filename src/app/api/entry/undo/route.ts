import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Participant ID is required.' }, { status: 400 });
    }

    const existing = await prisma.registration.findFirst({
      where: {
        OR: [
          { id },
          { participantId: { equals: id, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }

    const updated = await prisma.registration.update({
      where: { id: existing.id },
      data: {
        isEntered: false,
        enteredAt: null,
      },
    });

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache();

    return NextResponse.json({
      success: true,
      message: 'Check-in reverted successfully.',
      participant: updated,
    });
  } catch (error) {
    console.error('Undo entry error:', error);
    return NextResponse.json({ error: 'Failed to undo check-in' }, { status: 500 });
  }
}
