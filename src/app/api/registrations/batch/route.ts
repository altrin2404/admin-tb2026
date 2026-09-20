import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { action, ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No participant IDs provided' }, { status: 400 });
    }

    if (action === 'verify') {
      const recordsToVerify = await prisma.registration.findMany({
        where: { id: { in: ids } },
      });

      await prisma.registration.updateMany({
        where: { id: { in: ids } },
        data: { isVerified: true },
      });

      const { triggerVerificationEmail } = await import('@/lib/email');
      recordsToVerify.forEach((record) => {
        triggerVerificationEmail(record).catch((e) => console.error('Batch email trigger error:', e));
      });

      return NextResponse.json({ message: `Successfully verified ${ids.length} registrations and queued confirmation emails` });
    }

    if (action === 'unverify') {
      await prisma.registration.updateMany({
        where: { id: { in: ids } },
        data: { isVerified: false },
      });
      return NextResponse.json({ message: `Successfully marked ${ids.length} registrations as unverified` });
    }

    if (action === 'checkin') {
      await prisma.registration.updateMany({
        where: { id: { in: ids } },
        data: { isEntered: true, enteredAt: new Date() },
      });
      return NextResponse.json({ message: `Successfully checked in ${ids.length} participants` });
    }

    if (action === 'checkout') {
      await prisma.registration.updateMany({
        where: { id: { in: ids } },
        data: { isEntered: false, enteredAt: null },
      });
      return NextResponse.json({ message: `Successfully reset check-in for ${ids.length} participants` });
    }

    if (action === 'delete') {
      await prisma.registration.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ message: `Successfully deleted ${ids.length} registrations` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Batch action error:', error);
    return NextResponse.json({ error: 'Batch action failed' }, { status: 500 });
  }
}
