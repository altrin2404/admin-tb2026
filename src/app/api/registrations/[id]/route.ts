import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
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

    return NextResponse.json(registration);
  } catch (error) {
    const { logger } = await import('@/lib/logger');
    logger.error('Error fetching registration', error);
    return NextResponse.json({ error: 'Failed to fetch registration' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.registration.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (body.teamId && body.teamId !== existing.teamId) {
      const existingTeamCount = await prisma.registration.count({
        where: { teamId: body.teamId }
      });
      if (existingTeamCount >= 2) {
        return NextResponse.json(
          { error: 'This team already has the maximum of 2 members. Please create a new team or use another ID.' },
          { status: 400 }
        );
      }
    }

    // Determine entry timestamp transition
    let enteredAt = existing.enteredAt;
    if (body.isEntered !== undefined) {
      if (body.isEntered && !existing.isEntered) {
        enteredAt = new Date();
      } else if (!body.isEntered) {
        enteredAt = null;
      }
    }

    const { sanitizeString, validatePhoneNumber, validateEmail, validateAmount, sanitizeEventList } = await import('@/lib/validation');

    let phone = existing.phone;
    if (body.phone !== undefined) {
      const phoneValidation = validatePhoneNumber(body.phone);
      if (!phoneValidation.valid) {
        return NextResponse.json({ error: phoneValidation.error || 'Invalid phone number.' }, { status: 400 });
      }
      phone = phoneValidation.normalized;
    }

    let email = existing.email;
    if (body.email !== undefined && String(body.email).trim().length > 0) {
      const emailValidation = validateEmail(body.email);
      if (!emailValidation.valid) {
        return NextResponse.json({ error: emailValidation.error || 'Invalid email address.' }, { status: 400 });
      }
      email = emailValidation.normalized;
    }

    const techEvents = body.technicalEvents !== undefined 
      ? JSON.stringify(sanitizeEventList(body.technicalEvents))
      : existing.technicalEvents;

    const nonTechEvents = body.nonTechnicalEvents !== undefined
      ? JSON.stringify(sanitizeEventList(body.nonTechnicalEvents))
      : existing.nonTechnicalEvents;

    let nextPaymentStatus = body.paymentStatus !== undefined ? body.paymentStatus : existing.paymentStatus;
    if (body.isVerified !== undefined) {
      if (body.isVerified === true && (nextPaymentStatus === 'INITIALIZED' || nextPaymentStatus === 'PENDING')) {
        nextPaymentStatus = 'PAID';
      } else if (body.isVerified === false && nextPaymentStatus === 'PAID') {
        nextPaymentStatus = 'PENDING';
      }
    }

    const { formatParticipantId } = await import('@/lib/idGenerator');
    const participantId = existing.participantId || formatParticipantId(existing.participantNumber || 1);

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        participantId,
        name: body.name !== undefined ? sanitizeString(body.name, 100) : existing.name,
        email,
        phone,
        college: body.college !== undefined ? sanitizeString(body.college, 150) : existing.college,
        department: body.department !== undefined ? sanitizeString(body.department, 100) : existing.department,
        year: body.year !== undefined ? sanitizeString(body.year, 50) : existing.year,
        teamName: body.teamName !== undefined ? sanitizeString(body.teamName, 100) : existing.teamName,
        paymentUtr: body.paymentUtr !== undefined ? sanitizeString(body.paymentUtr, 60) : existing.paymentUtr,
        paymentStatus: nextPaymentStatus,
        amount: body.amount !== undefined ? validateAmount(body.amount, existing.amount || 250) : existing.amount,
        isVerified: body.isVerified !== undefined ? Boolean(body.isVerified) : existing.isVerified,
        isEntered: body.isEntered !== undefined ? Boolean(body.isEntered) : existing.isEntered,
        enteredAt,
        entryNotes: body.entryNotes !== undefined ? sanitizeString(body.entryNotes, 250) : existing.entryNotes,
        technicalEvents: techEvents,
        nonTechnicalEvents: nonTechEvents,
      },
    });

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache();

    // Trigger official confirmation email if transitioned to verified or requested explicitly
    let emailDispatched = false;
    if ((body.isVerified === true && !existing.isVerified) || body.sendEmail === true) {
      const { triggerVerificationEmail } = await import('@/lib/email');
      const { logger } = await import('@/lib/logger');
      triggerVerificationEmail(updated).catch((e: unknown) => logger.error('Email trigger failed', e));
      emailDispatched = true;

      // Also sync to Google Sheets
      const googleSheetWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      if (googleSheetWebhookUrl) {
        const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const rowData = {
          timestamp,
          teamId: updated.participantId || updated.id,
          participantId: updated.participantId || updated.id,
          teamName: updated.teamName || 'Individual',
          memberNumber: 1, // Simplifying since this syncs individual rows
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          department: updated.department || "",
          year: updated.year || "",
          college: updated.college,
          technicalEvents: JSON.parse(updated.technicalEvents || "[]").join(", "),
          nonTechnicalEvents: JSON.parse(updated.nonTechnicalEvents || "[]").join(", "),
          paymentUtr: updated.razorpayPaymentId || updated.paymentUtr || "N/A",
          amount: updated.amount || 250,
        };
        fetch(googleSheetWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "register", rows: [rowData] }),
        }).catch(err => {
          import('@/lib/logger').then(({ logger }) => logger.error("Google Sheets backup sync failed", err));
        });
      }
    }

    return NextResponse.json({ 
      message: 'Registration updated successfully', 
      registration: updated,
      emailDispatched
    });
  } catch (error) {
    const { logger } = await import('@/lib/logger');
    logger.error('Error updating registration', error);
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.registration.delete({
      where: { id },
    });

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache();

    return NextResponse.json({ message: 'Registration deleted successfully' });
  } catch (error) {
    const { logger } = await import('@/lib/logger');
    logger.error('Error deleting registration', error);
    return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
  }
}
