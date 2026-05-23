/**
 * MTG player terminology → what cards actually do in oracle text.
 * Used to interpret Find Cards prompts before ability matching.
 */

import { normalizeWithTypos } from './fuzzy-text'

export type JargonTerm = {
  id: string
  /** Words players type */
  aliases: RegExp[]
  /** What the card must do */
  description: string
}

export const JARGON: JargonTerm[] = [
  {
    id: 'tutor',
    aliases: [/\btutor(?:s|ing|ed)?\b/i, /\btutors?\b/i],
    description: 'Search your library for a specific card (not a land)',
  },
  {
    id: 'ramp',
    aliases: [/\bramp\b/i, /\bmana rock\b/i, /\bmana dork\b/i, /\baccelerat/i],
    description: 'Add mana or put extra lands onto the battlefield',
  },
  {
    id: 'removal',
    aliases: [/\bremoval\b/i, /\bspot removal\b/i, /\bsingle target removal\b/i],
    description: 'Destroy or exile a single target permanent/creature',
  },
  {
    id: 'wipe',
    aliases: [/\bboard wipe\b/i, /\bmass removal\b/i, /\bsweeper\b/i],
    description: 'Destroy or damage all creatures/permanents',
  },
  {
    id: 'draw',
    aliases: [/\bcard draw\b/i, /\bdraw engine\b/i],
    description: 'Draw cards',
  },
  {
    id: 'counterspell',
    aliases: [/\bcounterspell\b/i, /\bpermission\b/i, /\bstack interaction\b/i],
    description: 'Counter target spell or ability',
  },
  {
    id: 'reanimate',
    aliases: [/\breanimate\b/i, /\breanimator\b/i, /\brecur(?:sion)?\b/i],
    description: 'Return a creature/card from the graveyard to play',
  },
  {
    id: 'mill',
    aliases: [/\bmill\b/i],
    description: 'Put cards from a library into the graveyard',
  },
  {
    id: 'blink',
    aliases: [/\bblink\b/i, /\bflicker\b/i],
    description: 'Exile a permanent and return it to the battlefield',
  },
  {
    id: 'token',
    aliases: [/\btoken(?:s)?\b/i, /\bgo wide\b/i, /\bgo-wide\b/i],
    description: 'Create creature tokens',
  },
  {
    id: 'sacrifice',
    aliases: [/\baristocrats?\b/i, /\bsac outlet\b/i],
    description: 'Sacrifice creatures for value',
  },
  {
    id: 'protection',
    aliases: [/\bprotection\b/i, /\bhexproof\b/i, /\bindestructible\b/i],
    description: 'Protect your permanents from removal',
  },
  {
    id: 'burn',
    aliases: [/\bburn\b/i, /\bbolt\b/i],
    description: 'Deal direct damage to a creature or player',
  },
  {
    id: 'etb',
    aliases: [/\betb\b/i, /\benters the battlefield\b/i, /\benter(?:s)? the battlefield\b/i],
    description: 'Enters-the-battlefield trigger',
  },
  {
    id: 'landfall',
    aliases: [/\blandfall\b/i, /\blands matter\b/i],
    description: 'Triggers when lands enter the battlefield',
  },
  {
    id: 'treasure',
    aliases: [/\btreasure\b/i],
    description: 'Create Treasure tokens',
  },
  {
    id: 'proliferate',
    aliases: [/\bproliferate\b/i],
    description: 'Proliferate counters',
  },
  {
    id: 'discard',
    aliases: [/\bdiscard outlet\b/i, /\bloot\b/i, /\brummage\b/i],
    description: 'Discard cards for benefit',
  },
  {
    id: 'graveyard-hate',
    aliases: [/\bgraveyard hate\b/i, /\bgy hate\b/i, /\brest in peace effect\b/i],
    description: 'Exile graveyards or stop graveyard use',
  },
  {
    id: 'tax',
    aliases: [/\btax\b/i, /\btaxes\b/i, /\bstax\b/i],
    description: 'Make opponents pay extra or limit actions',
  },
]

/** Expand prompt with plain-English hints for intent detection */
export function normalizePrompt(prompt: string): string {
  const { text } = normalizeWithTypos(prompt)
  return text
}

export function detectJargon(prompt: string): string[] {
  const found: string[] = []
  for (const term of JARGON) {
    if (term.aliases.some((re) => re.test(prompt))) found.push(term.id)
  }
  return found
}

export function extractTutorTarget(prompt: string): string | null {
  const p = prompt.toLowerCase()
  if (/creature/.test(p)) return 'creature'
  if (/artifact/.test(p)) return 'artifact'
  if (/enchantment/.test(p)) return 'enchantment'
  if (/instant|sorcery|spell/.test(p)) return 'spell'
  if (/planeswalker/.test(p)) return 'planeswalker'
  if (/land/.test(p)) return 'land'
  return null
}
