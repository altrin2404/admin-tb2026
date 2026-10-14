export interface ParticipantEmailData {
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

/**
 * Verification email sending has been permanently disabled as requested.
 */
export async function triggerVerificationEmail(_participant: ParticipantEmailData) {
  return { success: false, reason: 'Verification emails are disabled' };
}
