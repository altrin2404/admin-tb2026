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
    console.error('Error fetching registration:', error);
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

    // Determine entry timestamp transition
    let enteredAt = existing.enteredAt;
    if (body.isEntered !== undefined) {
      if (body.isEntered && !existing.isEntered) {
        enteredAt = new Date();
      } else if (!body.isEntered) {
        enteredAt = null;
      }
    }

    const techEvents = body.technicalEvents !== undefined 
      ? (typeof body.technicalEvents === 'string' ? body.technicalEvents : JSON.stringify(body.technicalEvents))
      : existing.technicalEvents;

    const nonTechEvents = body.nonTechnicalEvents !== undefined
      ? (typeof body.nonTechnicalEvents === 'string' ? body.nonTechnicalEvents : JSON.stringify(body.nonTechnicalEvents))
      : existing.nonTechnicalEvents;

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        email: body.email !== undefined ? body.email : existing.email,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        college: body.college !== undefined ? body.college : existing.college,
        department: body.department !== undefined ? body.department : existing.department,
        year: body.year !== undefined ? body.year : existing.year,
        teamName: body.teamName !== undefined ? body.teamName : existing.teamName,
        paymentUtr: body.paymentUtr !== undefined ? body.paymentUtr : existing.paymentUtr,
        amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
        isVerified: body.isVerified !== undefined ? body.isVerified : existing.isVerified,
        isEntered: body.isEntered !== undefined ? body.isEntered : existing.isEntered,
        enteredAt,
        entryNotes: body.entryNotes !== undefined ? body.entryNotes : existing.entryNotes,
        technicalEvents: techEvents,
        nonTechnicalEvents: nonTechEvents,
      },
    });

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache();

    return NextResponse.json({ message: 'Registration updated successfully', registration: updated });
  } catch (error) {
    console.error('Error updating registration:', error);
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
    console.error('Error deleting registration:', error);
    return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
  }
}
