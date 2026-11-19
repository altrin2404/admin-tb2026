/**
 * Configuration and utilities for hidden registration entries.
 *
 * These entries are hidden from dashboards, statistics, event rosters, and exports,
 * while being safely preserved in the database (NEVER deleted).
 *
 * To unhide / recover these entries in the future:
 * Set HIDE_ENTRIES_ENABLED = false below.
 */

export const HIDE_ENTRIES_ENABLED = true;

export const HIDDEN_PARTICIPANT_NUMBERS: number[] = [
  143, 144, 145, 146, 147,
  149, 150, 151, 152,
  159,
  161, 162, 163,
  165,
  167,
  169,
];

export const HIDDEN_PARTICIPANT_IDS: string[] = [
  'TB143', 'TB144', 'TB145', 'TB146', 'TB147',
  'TB149', 'TB150', 'TB151', 'TB152',
  'TB159',
  'TB161', 'TB162', 'TB163',
  'TB165',
  'TB167',
  'TB169',
];

export const HIDDEN_DB_IDS: string[] = [
  'cmv86fj7c0004w0b77cp1n33r', // TB143 - Aaris ahamed
  'cmv86i7h00005w0b7d95s4kxw', // TB144 - Shynu
  'cmv86k8c60006w0b7vgr6cyrd', // TB145 - Shibi Deepak
  'cmv86n0hk0007w0b77odn4twq', // TB146 - Akshaya B V
  'cmv86q8y80008w0b7pa9trt10', // TB147 - Amrita
  'cmv86v6wr000aw0b7bvvj947l', // TB149 - Blessing Bryson Hong P M K
  'cmv86xc34000bw0b7lx29hnnu', // TB150 - Earnest Abraham E A
  'cmv86zq8c000cw0b7r7p10nz0', // TB151 - Jerushin J
  'cmv871l5d000dw0b71021cb1v', // TB152 - Jesinth S
  'cmv87odk0000iw0b7b80f5fgz', // TB159 - Hari Suthan
  'cmv87r94l0002yz61cksj7q7h', // TB161 - Ananthu Krishnan
  'cmv87t1ha0003yz61u1xvnjv7', // TB162 - Akash P S
  'cmv87vd0t0004yz61nteikst7', // TB163 - Akash T
  'cmv87z1uh0006yz61fcwe68ms', // TB165 - Sajina M
  'cmv8839at000kw0b7rr4srslt', // TB167 - Godlin Preetha M
  'cmv887jcb0008yz61ozd5w39v', // TB169 - Abinaya X
];

export function isHiddenRegistration(r: {
  id?: string | null;
  participantNumber?: number | null;
  participantId?: string | null;
  formattedParticipantId?: string | null;
}): boolean {
  if (!HIDE_ENTRIES_ENABLED) return false;
  if (r.id && HIDDEN_DB_IDS.includes(r.id)) return true;
  if (r.participantNumber && HIDDEN_PARTICIPANT_NUMBERS.includes(r.participantNumber)) return true;
  if (r.participantId && HIDDEN_PARTICIPANT_IDS.includes(r.participantId)) return true;
  if (r.formattedParticipantId && HIDDEN_PARTICIPANT_IDS.includes(r.formattedParticipantId)) return true;
  return false;
}

