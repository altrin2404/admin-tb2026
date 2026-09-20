import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatParticipantId } from '@/lib/idGenerator';

export async function POST(request: Request) {
  try {
    const { qrData } = await request.json();

    if (!qrData || typeof qrData !== 'string') {
      return NextResponse.json({ error: 'QR Code content is required.' }, { status: 400 });
    }

    const trimmed = qrData.trim();
    
    // Support parsing numbers or TB prefixes (e.g. '1' -> 'TB001', 'tb5' -> 'TB005')
    const numericPart = trimmed.replace(/^TB-?/i, '').trim();
    const parsedNum = !isNaN(Number(numericPart)) && Number(numericPart) > 0 ? parseInt(numericPart, 10) : null;
    const formattedFromNum = parsedNum ? formatParticipantId(parsedNum) : null;

    // Website format can be `${teamId}|${name}|${college}` or contains participantId
    const parts = trimmed.split('|');
    const teamOrId = parts[0]?.trim();
    const nameFromQr = parts[1]?.trim();

    // Look up by participantId (e.g. TB001), participantNumber, teamId, id, phone, or name match
    let participants = await prisma.registration.findMany({
      where: {
        OR: [
          { participantId: { equals: teamOrId, mode: 'insensitive' } },
          ...(formattedFromNum ? [{ participantId: { equals: formattedFromNum, mode: 'insensitive' as const } }] : []),
          ...(parsedNum ? [{ participantNumber: parsedNum }] : []),
          { teamId: { equals: teamOrId, mode: 'insensitive' as const } },
          { id: teamOrId },
          { phone: teamOrId },
          { paymentUtr: { equals: teamOrId, mode: 'insensitive' as const } },
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
            { participantId: { contains: trimmed, mode: 'insensitive' } },
            { teamId: { contains: trimmed, mode: 'insensitive' } },
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

      const seqNum = p.participantNumber || 1;
      const participantId = p.participantId || formatParticipantId(seqNum);

      return {
        ...p,
        participantId,
        formattedParticipantId: participantId,
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
