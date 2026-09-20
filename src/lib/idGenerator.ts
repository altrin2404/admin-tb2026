/**
 * TechBETA 2026 2.0 - Management System Participant ID Helper
 * Formats sequence numbers into standardized internal participant IDs:
 * e.g. 1 -> TB001, 2 -> TB002, 25 -> TB025, 100 -> TB100
 */
export function formatParticipantId(sequenceNumber: number): string {
  if (!sequenceNumber || sequenceNumber < 1) return 'TB001';
  return `TB${sequenceNumber.toString().padStart(3, '0')}`;
}
