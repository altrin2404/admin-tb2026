import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { formatParticipantId } from '@/lib/idGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const event = searchParams.get('event') || '';
    const college = searchParams.get('college') || '';
    const entryStatus = searchParams.get('entryStatus') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';

    // Check fast cache first
    let withSequentialIds = getCached<any[]>('registrations_processed', 4000);

    if (!withSequentialIds) {
      const registrations = await prisma.registration.findMany({
        orderBy: { createdAt: 'asc' },
      });

      withSequentialIds = registrations.map((reg, index) => {
        let techEvents: string[] = [];
        let nonTechEvents: string[] = [];

        try {
          techEvents = reg.technicalEvents ? JSON.parse(reg.technicalEvents) : (reg.event1 ? [reg.event1] : []);
        } catch {
          techEvents = reg.event1 ? [reg.event1] : [];
        }

        try {
          nonTechEvents = reg.nonTechnicalEvents ? JSON.parse(reg.nonTechnicalEvents) : (reg.event2 ? [reg.event2] : []);
        } catch {
          nonTechEvents = reg.event2 ? [reg.event2] : [];
        }

        const seqNum = reg.participantNumber || index + 1;
        const participantId = reg.participantId || (reg.paymentStatus !== 'INITIALIZED' ? formatParticipantId(seqNum) : null);

        return {
          ...reg,
          participantNumber: seqNum,
          participantId,
          formattedParticipantId: participantId,
          techEventsList: techEvents,
          nonTechEventsList: nonTechEvents,
          allEvents: [...techEvents, ...nonTechEvents],
        };
      });

      setCached('registrations_processed', withSequentialIds);
    }

    // Apply fast filtering
    const filtered = withSequentialIds.filter((p) => {
      if (search) {
        const matchesSearch =
          (p.participantId && p.participantId.toLowerCase().includes(search)) ||
          (p.formattedParticipantId && p.formattedParticipantId.toLowerCase().includes(search)) ||
          p.name.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search) ||
          p.phone.toLowerCase().includes(search) ||
          p.college.toLowerCase().includes(search) ||
          (p.teamId && p.teamId.toLowerCase().includes(search)) ||
          (p.paymentUtr && p.paymentUtr.toLowerCase().includes(search)) ||
          p.participantNumber.toString() === search;
        if (!matchesSearch) return false;
      }

      if (event) {
        const hasEvent = p.allEvents.some((ev: string) => ev.toLowerCase().includes(event.toLowerCase()));
        if (!hasEvent) return false;
      }

      if (college && p.college.toLowerCase() !== college.toLowerCase()) {
        return false;
      }

      if (entryStatus === 'entered' && !p.isEntered) return false;
      if (entryStatus === 'not_entered' && p.isEntered) return false;

      if (paymentStatus === 'verified' && !p.isVerified) return false;
      if (paymentStatus === 'pending' && p.isVerified) return false;

      return true;
    });

    const colleges = Array.from(new Set(withSequentialIds.map((r) => (r.college || '').trim()))).filter(Boolean).sort();

    return NextResponse.json({
      total: withSequentialIds.length,
      filteredCount: filtered.length,
      registrations: filtered,
      colleges,
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      college,
      department,
      year,
      teamName,
      technicalEvents,
      nonTechnicalEvents,
      paymentUtr,
      amount,
      isVerified,
      isEntered,
      entryNotes,
    } = body;

    if (!name || !college || !phone) {
      return NextResponse.json(
        { error: 'Name, college, and phone number are required.' },
        { status: 400 }
      );
    }

    if (body.teamId) {
      const existingTeamCount = await prisma.registration.count({
        where: { teamId: body.teamId }
      });
      if (existingTeamCount >= 2) {
        return NextResponse.json(
          { error: 'This team already has the maximum of 2 members. Please create a new team.' },
          { status: 400 }
        );
      }
    }

    const timestamp = Date.now().toString().slice(-4);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const teamId = body.teamId || `TB26-${timestamp}-${randomHex}`;

    const techList = Array.isArray(technicalEvents) ? technicalEvents : (technicalEvents ? [technicalEvents] : []);
    const nonTechList = Array.isArray(nonTechnicalEvents) ? nonTechnicalEvents : (nonTechnicalEvents ? [nonTechnicalEvents] : []);

    const created = await prisma.registration.create({
      data: {
        teamId,
        teamName: teamName || null,
        name: name.trim(),
        email: email?.trim() || `${phone}@spot.techbeta.in`,
        phone: phone.trim(),
        college: college.trim(),
        department: department?.trim() || 'General',
        year: year?.trim() || '1st Year',
        event1: techList[0] || nonTechList[0] || 'GENBUILD',
        event2: techList[1] || nonTechList[1] || null,
        technicalEvents: JSON.stringify(techList),
        nonTechnicalEvents: JSON.stringify(nonTechList),
        paymentUtr: paymentUtr?.trim() || 'SPOT-CASH',
        amount: amount || 250,
        isVerified: isVerified ?? true,
        isEntered: isEntered ?? false,
        enteredAt: isEntered ? new Date() : null,
        entryNotes: entryNotes || 'Spot Registration',
      },
    });

    const participantId = formatParticipantId(created.participantNumber || 1);
    const updated = await prisma.registration.update({
      where: { id: created.id },
      data: { participantId },
    });

    // Invalidate cache immediately on new registration
    invalidateCache();

    return NextResponse.json(
      { message: 'Spot registration created successfully', registration: updated },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating spot registration:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}
