import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TECHBETA_EVENTS, getShortCode, formatEventId } from '@/lib/events';
import { formatParticipantId } from '@/lib/idGenerator';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_FILE = path.join(process.cwd(), 'event_configs.json');

function getEventConfigs(): Record<string, string> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveEventConfigs(configs: Record<string, string>) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
  } catch (err) {
    console.error('Failed to save event configs:', err);
  }
}

export async function GET() {
  try {
    const { getCached, setCached } = await import('@/lib/cache');
    const cachedEvents = getCached<any>('events_report', 5000);
    if (cachedEvents) {
      return NextResponse.json(cachedEvents);
    }

    const registrations = await prisma.registration.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const savedConfigs = getEventConfigs();

    // Map each predefined event and calculate roster
    const eventReports = TECHBETA_EVENTS.map((eventDef) => {
      const shortCode = eventDef.shortCode;
      const configuredType = savedConfigs[eventDef.id] || eventDef.defaultType;

      // 1. Gather all registrations that match this event
      const matchingRegs: typeof registrations = [];
      registrations.forEach((reg) => {
        let techList: string[] = [];
        let nonTechList: string[] = [];
        try {
          techList = reg.technicalEvents ? JSON.parse(reg.technicalEvents) : (reg.event1 ? [reg.event1] : []);
        } catch {
          techList = reg.event1 ? [reg.event1] : [];
        }
        try {
          nonTechList = reg.nonTechnicalEvents ? JSON.parse(reg.nonTechnicalEvents) : (reg.event2 ? [reg.event2] : []);
        } catch {
          nonTechList = reg.event2 ? [reg.event2] : [];
        }

        const allRegEvents = [...techList, ...nonTechList, reg.event1, reg.event2].filter(Boolean) as string[];
        
        // Match if any event name or shortcode matches
        const matches = allRegEvents.some((ev) => {
          const sc = getShortCode(ev);
          return sc === shortCode || ev.toLowerCase().includes(eventDef.name.toLowerCase()) || eventDef.name.toLowerCase().includes(ev.toLowerCase());
        });

        if (matches) {
          matchingRegs.push(reg);
        }
      });

      // 2. Count occurrences of team key within this event to distinguish Teams from Individuals
      const teamCounts = new Map<string, number>();
      matchingRegs.forEach((reg) => {
        const teamKey = reg.teamId?.trim() || (reg.teamName?.trim() && reg.teamName.trim().toLowerCase() !== 'individual' ? `name:${reg.teamName.trim().toLowerCase()}` : null);
        if (teamKey) {
          teamCounts.set(teamKey, (teamCounts.get(teamKey) || 0) + 1);
        }
      });

      // 3. Assign sequential event IDs:
      // - If participants register as a team (sharing teamKey with other members in this event),
      //   both/all of them are flagged with the SAME event sequence number (e.g. LT01).
      // - If registered as an individual, they get their own unique sequence number (e.g. LT02).
      // - Master numbers (e.g. TB001, TB002) remain completely distinct and never confused with event IDs.
      let currentEventSeq = 0;
      const teamSeqMap = new Map<string, number>();

      const participantsForEvent: Array<typeof registrations[0] & {
        eventSequenceId: string;
        eventSequenceNumber: number;
        formattedParticipantId?: string;
        isTeamEntry: boolean;
      }> = [];

      matchingRegs.forEach((reg) => {
        const teamKey = reg.teamId?.trim() || (reg.teamName?.trim() && reg.teamName.trim().toLowerCase() !== 'individual' ? `name:${reg.teamName.trim().toLowerCase()}` : null);
        const isTeam = !!(teamKey && (teamCounts.get(teamKey) || 0) > 1);

        let seq: number;
        if (isTeam && teamKey) {
          if (teamSeqMap.has(teamKey)) {
            seq = teamSeqMap.get(teamKey)!;
          } else {
            currentEventSeq++;
            teamSeqMap.set(teamKey, currentEventSeq);
            seq = currentEventSeq;
          }
        } else {
          currentEventSeq++;
          seq = currentEventSeq;
        }

        const seqNum = reg.participantNumber || 1;
        const participantId = reg.participantId || formatParticipantId(seqNum);

        participantsForEvent.push({
          ...reg,
          participantId,
          formattedParticipantId: participantId,
          eventSequenceId: formatEventId(shortCode, seq), // e.g. LT01, GB01
          eventSequenceNumber: seq,
          isTeamEntry: isTeam,
        });
      });

      const totalRegistered = participantsForEvent.length;
      const totalEntered = participantsForEvent.filter((p) => p.isEntered).length;
      const totalVerified = participantsForEvent.filter((p) => p.isVerified).length;

      return {
        id: eventDef.id,
        name: eventDef.name,
        shortCode: eventDef.shortCode,
        category: eventDef.category,
        currentType: configuredType, // 'Individual' | 'Team of 2' | 'Team (1-2)'
        totalRegistered,
        totalEntered,
        totalVerified,
        participants: participantsForEvent,
      };
    });

    const responsePayload = {
      events: eventReports,
      configs: savedConfigs,
    };
    setCached('events_report', responsePayload);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Failed to fetch event data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { eventId, participationType } = await request.json();

    if (!eventId || !participationType) {
      return NextResponse.json({ error: 'eventId and participationType required' }, { status: 400 });
    }

    const configs = getEventConfigs();
    configs[eventId] = participationType;
    saveEventConfigs(configs);

    const { invalidateCache } = await import('@/lib/cache');
    invalidateCache();

    return NextResponse.json({
      message: 'Event participation type updated',
      configs,
    });
  } catch (error) {
    console.error('Update event config error:', error);
    return NextResponse.json({ error: 'Failed to update event configuration' }, { status: 500 });
  }
}
