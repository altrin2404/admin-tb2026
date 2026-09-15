import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TECHBETA_EVENTS, getShortCode } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getCached, setCached } = await import('@/lib/cache');
    const cachedStats = getCached<any>('dashboard_stats', 5000);
    if (cachedStats) {
      return NextResponse.json(cachedStats);
    }

    const all = await prisma.registration.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const totalParticipants = all.length;
    const totalEntered = all.filter((r) => r.isEntered).length;
    const yetToArrive = totalParticipants - totalEntered;
    const attendanceRate = totalParticipants > 0 ? Math.round((totalEntered / totalParticipants) * 100) : 0;

    // Unique teams
    const uniqueTeams = new Set(all.map((r) => r.teamId).filter(Boolean));
    const totalTeams = uniqueTeams.size;

    // Revenue calculation
    const totalRevenue = all.reduce((acc, curr) => acc + (curr.amount || 200), 0);
    const verifiedRevenue = all
      .filter((r) => r.isVerified)
      .reduce((acc, curr) => acc + (curr.amount || 200), 0);
    const pendingRevenue = totalRevenue - verifiedRevenue;

    // College distribution
    const collegeCounts: Record<string, { total: number; entered: number }> = {};
    all.forEach((r) => {
      const col = (r.college || 'Other').trim();
      if (!collegeCounts[col]) {
        collegeCounts[col] = { total: 0, entered: 0 };
      }
      collegeCounts[col].total += 1;
      if (r.isEntered) collegeCounts[col].entered += 1;
    });

    const collegeStats = Object.entries(collegeCounts)
      .map(([college, stats]) => ({
        college,
        total: stats.total,
        entered: stats.entered,
      }))
      .sort((a, b) => b.total - a.total);

    // Event distribution
    const eventCounts: Record<string, { name: string; shortCode: string; count: number; entered: number }> = {};
    TECHBETA_EVENTS.forEach((e) => {
      eventCounts[e.shortCode] = { name: e.name, shortCode: e.shortCode, count: 0, entered: 0 };
    });

    all.forEach((r) => {
      let events: string[] = [];
      try {
        const t = r.technicalEvents ? JSON.parse(r.technicalEvents) : [];
        const nt = r.nonTechnicalEvents ? JSON.parse(r.nonTechnicalEvents) : [];
        events = [...t, ...nt];
      } catch {
        events = [r.event1, r.event2].filter(Boolean) as string[];
      }

      events.forEach((ev) => {
        const sc = getShortCode(ev);
        if (eventCounts[sc]) {
          eventCounts[sc].count += 1;
          if (r.isEntered) eventCounts[sc].entered += 1;
        }
      });
    });

    // Recent check-ins (enteredAt is not null)
    const recentCheckIns = all
      .filter((r) => r.isEntered && r.enteredAt)
      .sort((a, b) => new Date(b.enteredAt!).getTime() - new Date(a.enteredAt!).getTime())
      .slice(0, 8);

    const statsPayload = {
      summary: {
        totalParticipants,
        totalEntered,
        yetToArrive,
        attendanceRate,
        totalTeams,
        totalRevenue,
        verifiedRevenue,
        pendingRevenue,
      },
      collegeStats,
      eventStats: Object.values(eventCounts),
      recentCheckIns,
    };
    setCached('dashboard_stats', statsPayload);

    return NextResponse.json(statsPayload);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
