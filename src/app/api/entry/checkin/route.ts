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

    const now = new Date();
    const updateData: Record<string, unknown> = {
      isEntered: true,
      enteredAt: now,
    };

    if (verifyPayment) {
      updateData.isVerified = true;
    }

    // -------------------------------------------------------------
    // Case 1: Team Check-In
    // -------------------------------------------------------------
    if (checkInTeam && target.teamId) {
      if (!forceOverride) {
        // Pre-check if any team member is already entered
        const alreadyEntered = await prisma.registration.findFirst({
          where: { teamId: target.teamId, isEntered: true },
        });
        if (alreadyEntered) {
          return NextResponse.json(
            {
              duplicate: true,
              error: `DUPLICATE ENTRY ALERT: Team member (${alreadyEntered.name}) already checked in!`,
              enteredAt: alreadyEntered.enteredAt,
              participant: alreadyEntered,
            },
            { status: 409 }
          );
        }
      }

      // Atomic conditional update on the team
      const updateWhere = forceOverride
        ? { teamId: target.teamId }
        : { teamId: target.teamId, isEntered: false };

      const batchResult = await prisma.registration.updateMany({
        where: updateWhere,
        data: updateData,
      });

      if (batchResult.count === 0 && !forceOverride) {
        const fresh = await prisma.registration.findFirst({
          where: { teamId: target.teamId },
        });
        return NextResponse.json(
          {
            duplicate: true,
            error: 'DUPLICATE ENTRY ALERT: Team members already checked in!',
            enteredAt: fresh?.enteredAt,
            participant: fresh,
          },
          { status: 409 }
        );
      }

      const updatedTeam = await prisma.registration.findMany({
        where: { teamId: target.teamId },
      });

      const { invalidateCache } = await import('@/lib/cache');
      invalidateCache();

      return NextResponse.json({
        success: true,
        message: `Checked in entire team (${updatedTeam.length} members)`,
        participant: updatedTeam[0],
        teamMembers: updatedTeam,
        enteredAt: now,
      });
    }

    // -------------------------------------------------------------
    // Case 2: Individual Check-In (ATOMIC CONDITIONAL UPDATE)
    // -------------------------------------------------------------
    if (!forceOverride) {
      // 1. Initial lookup check
      if (target.isEntered) {
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

      // 2. ATOMIC LOCK: Update only if isEntered is STILL false in PostgreSQL
      // This completely prevents race conditions from concurrent scans at different gates
      const updateResult = await prisma.registration.updateMany({
        where: {
          id: target.id,
          isEntered: false,
        },
        data: updateData,
      });

      if (updateResult.count === 0) {
        // Concurrent scan slipped in at the exact same millisecond
        const fresh = await prisma.registration.findUnique({
          where: { id: target.id },
        });
        return NextResponse.json(
          {
            duplicate: true,
            error: 'DUPLICATE ENTRY ALERT: Participant already checked in!',
            enteredAt: fresh?.enteredAt || target.enteredAt,
            participant: fresh || target,
          },
          { status: 409 }
        );
      }
    } else {
      // Forced coordinator override
      await prisma.registration.update({
        where: { id: target.id },
        data: updateData,
      });
    }

    const updated = await prisma.registration.findUnique({
      where: { id: target.id },
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
    const { logger } = await import('@/lib/logger');
    logger.error('Check-in error', error);
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  }
}
