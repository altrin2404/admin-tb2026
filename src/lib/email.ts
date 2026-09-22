interface ParticipantEmailData {
  id: string;
  participantId?: string | null;
  participantNumber?: number | null;
  teamId?: string | null;
  teamName?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  college: string;
  department?: string | null;
  year?: string | null;
  technicalEvents?: string | null | string[];
  nonTechnicalEvents?: string | null | string[];
  paymentUtr?: string | null;
  amount?: number | null;
}

export async function triggerVerificationEmail(participant: ParticipantEmailData) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl || !participant.email || !participant.email.includes('@')) {
    return { success: false, reason: 'No webhook or invalid email' };
  }

  const displayId =
    participant.participantId ||
    (participant.participantNumber ? `TB${String(participant.participantNumber).padStart(3, '0')}` : 'TB001');

  // Format events safely
  let techEvents = '';
  if (Array.isArray(participant.technicalEvents)) {
    techEvents = participant.technicalEvents.join(', ');
  } else if (typeof participant.technicalEvents === 'string') {
    try {
      const parsed = JSON.parse(participant.technicalEvents);
      techEvents = Array.isArray(parsed) ? parsed.join(', ') : participant.technicalEvents;
    } catch {
      techEvents = participant.technicalEvents;
    }
  }

  let nonTechEvents = '';
  if (Array.isArray(participant.nonTechnicalEvents)) {
    nonTechEvents = participant.nonTechnicalEvents.join(', ');
  } else if (typeof participant.nonTechnicalEvents === 'string') {
    try {
      const parsed = JSON.parse(participant.nonTechnicalEvents);
      nonTechEvents = Array.isArray(parsed) ? parsed.join(', ') : participant.nonTechnicalEvents;
    } catch {
      nonTechEvents = participant.nonTechnicalEvents;
    }
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        participant: {
          participantId: displayId,
          teamId: displayId,
          teamName: participant.teamName || '',
          name: participant.name,
          email: participant.email,
          phone: participant.phone || '',
          college: participant.college,
          department: participant.department || '',
          year: participant.year || '',
          technicalEvents: techEvents,
          nonTechnicalEvents: nonTechEvents,
          paymentUtr: participant.paymentUtr || 'VERIFIED',
          amount: participant.amount || 200,
        },
      }),
    });

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
