import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { id, teamId, checkInTeam, forceOverride, verifyPayment } = await request.json();

    if (!id && !teamId) {
      return NextResponse.json({ error: 'Participant ID or Team ID is required.' }, { status: 400 });
    }

    // Lookup participant
    const target = id 
      ? await prisma.registration.findUnique({ where: { id } })
      : await prisma.registration.findFirst({ where: { teamId } });

    if (!target) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }

    // Check for duplicate entry
    if (target.isEntered && !forceOverride) {
      return NextResponse.json(
        {
          duplicate: true,
          error: 'DUPLICATE ENTRY ALERT: Participant already checked in!',
          enteredAt: target.enteredAt,
          participant: target,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      isEntered: true,
      enteredAt: now,
    };

    if (verifyPayment) {
      updateData.isVerified = true;
    }

    if (checkInTeam && target.teamId) {
      // Check in all members of this team
      await prisma.registration.updateMany({
        where: { teamId: target.teamId },
        data: updateData,
      });

      const updatedTeam = await prisma.registration.findMany({
        where: { teamId: target.teamId },
      });

      return NextResponse.json({
        success: true,
        message: `Checked in entire team (${updatedTeam.length} members)`,
        participant: updatedTeam[0],
        teamMembers: updatedTeam,
        enteredAt: now,
      });
    }

    // Check in individual participant
    const updated = await prisma.registration.update({
      where: { id: target.id },
      data: updateData,
    });

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache();

    return NextResponse.json({
      success: true,
      message: 'Entry granted! Welcome to TechBETA 2026.',
      participant: updated,
      enteredAt: now,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  }
}
