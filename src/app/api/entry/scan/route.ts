import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { qrData } = await request.json();

    if (!qrData || typeof qrData !== 'string') {
      return NextResponse.json({ error: 'QR Code content is required.' }, { status: 400 });
    }

    const trimmed = qrData.trim();
    
    // Website format is `${regId}|${name}|${college}`
    const parts = trimmed.split('|');
    const teamOrId = parts[0]?.trim();
    const nameFromQr = parts[1]?.trim();

    // Look up by teamId, id, phone, or name match
    let participants = await prisma.registration.findMany({
      where: {
        OR: [
          { teamId: teamOrId },
          { id: teamOrId },
          { phone: teamOrId },
          { paymentUtr: teamOrId },
          ...(nameFromQr ? [{ name: { contains: nameFromQr, mode: 'insensitive' as const } }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // If still not found and it looks like a participant number or general query
    if (!participants.length) {
      participants = await prisma.registration.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { college: { contains: trimmed, mode: 'insensitive' } },
            { phone: { contains: trimmed } },
          ],
        },
      });
    }

    if (!participants.length) {
      return NextResponse.json(
        { 
          found: false, 
          error: 'No registration found matching this pass. Please check details or visit the Spot Registration desk.' 
        }, 
        { status: 404 }
      );
    }

    // Format results with event lists
    const formatted = participants.map((p) => {
      let tech: string[] = [];
      let nonTech: string[] = [];
      try {
        tech = p.technicalEvents ? JSON.parse(p.technicalEvents) : (p.event1 ? [p.event1] : []);
      } catch {
        tech = p.event1 ? [p.event1] : [];
      }
      try {
        nonTech = p.nonTechnicalEvents ? JSON.parse(p.nonTechnicalEvents) : (p.event2 ? [p.event2] : []);
      } catch {
        nonTech = p.event2 ? [p.event2] : [];
      }

      return {
        ...p,
        techEventsList: tech,
        nonTechEventsList: nonTech,
      };
    });

    const primary = formatted[0];
    const isDuplicate = primary.isEntered;

    return NextResponse.json({
      found: true,
      participant: primary,
      teamMembers: formatted,
      isDuplicate,
      enteredAt: primary.enteredAt,
      isVerified: primary.isVerified,
      status: isDuplicate ? 'already_entered' : (primary.isVerified ? 'ready' : 'payment_pending'),
    });
  } catch (error) {
    console.error('Scan lookup error:', error);
    return NextResponse.json({ error: 'Scan lookup failed' }, { status: 500 });
  }
}
