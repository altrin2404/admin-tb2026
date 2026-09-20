export interface EventDefinition {
  id: string;
  name: string;
  shortCode: string; // e.g. 'GB', 'UV', 'LT', 'IF', 'BB', 'BNB'
  category: 'Technical' | 'Non-Technical';
  defaultType: 'Individual' | 'Team of 2' | 'Team (1-2)';
  description: string;
}

export const TECHBETA_EVENTS: EventDefinition[] = [
  // ─── Technical Events ───────────────────────────────────────────
  {
    id: 'genbuild',
    name: 'GENBUILD',
    shortCode: 'GB',
    category: 'Technical',
    defaultType: 'Individual',
    description: 'Transform ideas into working prototypes using GenAI and AI-assisted development tools.',
  },
  {
    id: 'ui-verse',
    name: 'UI-VERSE',
    shortCode: 'UV',
    category: 'Technical',
    defaultType: 'Individual',
    description: 'Design challenge to create attractive, functional, user-friendly interfaces.',
  },
  {
    id: 'logic-trap',
    name: 'LOGIC TRAP',
    shortCode: 'LT',
    category: 'Technical',
    defaultType: 'Team (1-2)',
    description: 'Identify faults, hidden errors, or contradictions in confusing problem statements.',
  },
  {
    id: 'idea-forge',
    name: 'IDEA FORGE',
    shortCode: 'IF',
    category: 'Technical',
    defaultType: 'Team (1-2)',
    description: 'Pitch innovative technical ideas, novelty, approach, and potential impact.',
  },

  // ─── Non-Technical Events ─────────────────────────────────────────
  {
    id: 'brand-blitz',
    name: 'BRAND BLITZ',
    shortCode: 'BB',
    category: 'Non-Technical',
    defaultType: 'Team (1-2)',
    description: 'Creative advertising competition developing brand concept, tagline, and presentation.',
  },
  {
    id: 'bid-and-build',
    name: 'BID & BUILD',
    shortCode: 'BNB',
    category: 'Non-Technical',
    defaultType: 'Team (1-2)',
    description: 'Auction everyday objects with fixed budget to create and pitch an innovative product.',
  },
];

export function getShortCode(eventName: string): string {
  if (!eventName) return 'GEN';
  const clean = eventName.toLowerCase().trim();
  
  if (clean.includes('genbuild') || clean.includes('gb')) return 'GB';
  if (clean.includes('verse') || clean.includes('ui-verse') || clean.includes('uv') || (clean.includes('ui') && !clean.includes('build'))) return 'UV';
  if (clean.includes('logic') || clean.includes('trap') || clean.includes('lt')) return 'LT';
  if (clean.includes('forge') || clean.includes('idea') || clean.includes('if')) return 'IF';
  if (clean.includes('brand') || clean.includes('blitz') || clean.includes('bb')) return 'BB';
  if (clean.includes('bid') || clean.includes('bnb')) return 'BNB';

  // Legacy aliases for backwards compatibility with existing test/stored records
  if (clean.includes('prompt') || clean.includes('apw')) return 'GB';
  if (clean.includes('ux') || clean.includes('ub')) return 'UV';
  if (clean.includes('relay') || clean.includes('cr')) return 'LT';
  if (clean.includes('ad war') || clean.includes('aw')) return 'BB';
  if (clean.includes('detective') || clean.includes('ad')) return 'BNB';
  
  // Direct matches
  const directMatch = TECHBETA_EVENTS.find(e => 
    e.name.toLowerCase() === clean || 
    e.shortCode.toLowerCase() === clean
  );
  if (directMatch) return directMatch.shortCode;

  // Fallback
  const words = clean.split(/[\s/_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

/**
 * Format sequential Event ID (e.g. GB01, UV01, LT01, IF01, BB01, BNB01)
 */
export function formatEventId(shortCode: string, sequenceNumber: number): string {
  return `${shortCode}${sequenceNumber.toString().padStart(2, '0')}`;
}
