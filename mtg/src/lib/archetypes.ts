/** Archetype definitions used for local commander theme matching (not Scryfall syntax). */
export type ArchetypeDef = {
  id: string
  label: string
  aliases: string[]
  signals: RegExp[]
  excludeSignals?: RegExp[]
}

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'stax',
    label: 'Stax / taxes',
    aliases: ['stax', 'tax', 'taxes', 'prison', 'resource', 'denial', 'hate', 'lock', 'slow'],
    signals: [
      /unless .* pays?/i,
      /each opponent/i,
      /can't cast/i,
      /skip .* (combat|draw|upkeep)/i,
      /don't untap/i,
      /costs? \{[^}]+\} more to cast/i,
      /spells? cost .* more/i,
      /activated abilities cost/i,
    ],
  },
  {
    id: 'tokens',
    label: 'Tokens',
    aliases: ['token', 'tokens', 'wide', 'gowide', 'go-wide', 'army', 'swarm'],
    signals: [/create .* token/i, /token creatures? you control/i, /populate/i],
  },
  {
    id: 'aristocrats',
    label: 'Aristocrats',
    aliases: ['aristocrats', 'aristocrat', 'sacrifice', 'sac', 'dies', 'death'],
    signals: [/sacrifice (a|another|other)/i, /whenever .* dies/i, /dies, .* (draw|damage|create)/i],
  },
  {
    id: 'lands',
    label: 'Lands matter',
    aliases: ['lands', 'landfall', 'terrain', 'land'],
    signals: [/landfall/i, /lands? you control/i, /play .* (additional )?land/i],
  },
  {
    id: 'spellslinger',
    label: 'Spellslinger',
    aliases: ['spellslinger', 'instants', 'sorcery', 'spells', 'mage'],
    signals: [/instant or sorcery/i, /whenever you cast/i, /magecraft/i, /storm/i],
  },
  {
    id: 'counters',
    label: '+1/+1 counters',
    aliases: ['counter', 'counters', 'plusone', 'grow', 'proliferate'],
    signals: [/\+1\/\+1 counter/i, /proliferate/i, /double .* counters/i],
  },
  {
    id: 'voltron',
    label: 'Voltron',
    aliases: ['voltron', 'equipment', 'equip', 'aura', 'buff'],
    signals: [/equipped creature/i, /equipment/i, /enchant(ed)? creature/i],
  },
  {
    id: 'group-hug',
    label: 'Group hug',
    aliases: ['group-hug', 'grouphug', 'hug'],
    signals: [
      /each player may draw a card/i,
      /each player draws? (?:a |one |two |three |\d+ )?cards?/i,
      /each player gains? \d+ life/i,
      /each player adds? \{[wubrgc]/i,
      /each player may put (?:a |up to .* )?land .* onto the battlefield/i,
      /each player creates? .* [Tt]reasure tokens?/i,
    ],
    excludeSignals: [
      /whenever an opponent draws?.*(?:deals? \d+ damage|loses \d+ life)/i,
      /each player discards?/i,
      /each player sacrifices?/i,
      /each player may attack only/i,
      /you may cast any number of spells from among/i,
      /exile the top .* of (?:their|target opponent)/i,
    ],
  },
  {
    id: 'tribal',
    label: 'Tribal',
    aliases: [
      'tribal', 'tribe', 'elf', 'elves', 'goblin', 'zombie', 'dragon',
      'merfolk', 'vampire', 'soldier', 'cat', 'bird', 'sliver',
    ],
    signals: [
      /(elf|elves|goblin|zombie|dragon|merfolk|vampire|soldier|cat|bird|sliver)s? you control/i,
      /other .* you control get/i,
    ],
  },
  {
    id: 'blink',
    label: 'Blink / ETB',
    aliases: ['blink', 'flicker', 'etb', 'enters'],
    signals: [/exile .* return/i, /enters the battlefield/i, /leaves the battlefield/i],
  },
  {
    id: 'combo',
    label: 'Combo',
    aliases: ['combo', 'infinite', 'win', 'untap'],
    signals: [/untap .* (creatures?|permanents?)/i, /win the game/i, /infinite/i],
  },
  {
    id: 'lifegain',
    label: 'Lifegain',
    aliases: ['lifegain', 'life', 'gain', 'drain', 'extort'],
    signals: [/gain .* life/i, /you gain life/i, /extort/i],
  },
  {
    id: 'artifacts',
    label: 'Artifacts',
    aliases: ['artifacts', 'artifact', 'affinity', 'treasure', 'clue', 'food'],
    signals: [/artifact/i, /treasure token/i, /affinity for artifacts/i],
  },
  {
    id: 'enchantments',
    label: 'Enchantments',
    aliases: [
      'enchantments', 'enchantment', 'constellation', 'shrines', 'enchantress',
      'enchantrix', 'auras', 'enchant',
    ],
    signals: [
      /enchantment/i,
      /constellation/i,
      /shrine/i,
      /whenever you cast an enchantment/i,
      /enchantments? you control/i,
    ],
  },
  {
    id: 'theft',
    label: 'Theft / steal',
    aliases: ['theft', 'steal', 'thief', 'thieves', 'rob', 'robbery', 'greed', 'impulse'],
    signals: [
      /cast .* from (?:an )?opponent/i,
      /you may cast .* opponent/i,
      /look at the top .* opponent'?s? library.*you may cast/i,
      /exile the top .*cards? of (?:their|target opponent'?s?) library.*you may cast/i,
      /each player exiles? cards? from the top of their library.*you may cast/i,
      /exile .* face down.*you may cast/i,
      /exchange control of (?:target )?permanents?/i,
      /gain control of (?:target )?permanents?/i,
    ],
  },
  {
    id: 'superfriends',
    label: 'Superfriends (planeswalkers)',
    aliases: ['superfriends', 'planeswalker', 'planeswalkers', 'pw', 'walkers'],
    signals: [/planeswalker/i, /loyalty/i, /proliferate/i],
  },
  {
    id: 'burn',
    label: 'Burn / direct damage',
    aliases: ['burn', 'bolt', 'ping', 'reach', 'direct damage'],
    signals: [
      /(?:deals?|any target).* damage/i,
      /damage to (?:any )?target/i,
      /burn/i,
    ],
  },
  {
    id: 'mill',
    label: 'Mill',
    aliases: ['mill', 'milling', 'library destruction'],
    signals: [/mill/i, /put .* cards? .* into (?:their )?graveyard/i],
  },
  {
    id: 'graveyard',
    label: 'Graveyard / reanimator',
    aliases: ['reanimator', 'reanimate', 'recursion', 'graveyard', 'yard'],
    signals: [
      /from (?:your |a )?graveyard to the battlefield/i,
      /return .* from (?:your |a )?graveyard/i,
      /cast .* from (?:your )?graveyard/i,
      /play .* from (?:your )?graveyard/i,
      /(?:in|from) (?:your |a )?graveyard.{0,160}return .* to the battlefield/is,
      /return target (?:creature )?card from (?:your )?graveyard/i,
    ],
  },
  {
    id: 'combat',
    label: 'Combat / aggro',
    aliases: ['aggro', 'attack', 'combat', 'damage', 'beatdown', 'aggressive'],
    signals: [/attacks?/i, /combat damage/i, /can't be blocked/i],
  },
  {
    id: 'control',
    label: 'Control',
    aliases: ['control', 'counterspell', 'permission', 'answers'],
    signals: [/counter target/i, /return target/i, /destroy target/i],
  },
  {
    id: 'treasure',
    label: 'Ramp / mana',
    aliases: ['treasure', 'mana', 'rocks', 'ramp', 'signet'],
    signals: [/treasure token/i, /add \{[wubrgc]/i, /search your library for .* land/i],
  },
]

import { KEYWORD_TERMS, levenshtein, normalizeWithTypos } from './fuzzy-text'

const aliasToArchetype = new Map<string, string>()
for (const a of ARCHETYPES) {
  for (const alias of a.aliases) {
    aliasToArchetype.set(alias.toLowerCase(), a.id)
  }
  aliasToArchetype.set(a.id, a.id)
}

function fuzzyAliasMatch(token: string, alias: string): boolean {
  if (token.length < 4 || alias.length < 4) return token === alias
  return levenshtein(token, alias) <= (token.length <= 5 ? 1 : 2)
}

export function resolveThemeArchetypes(theme: string): string[] {
  const { text: normalized } = normalizeWithTypos(theme)
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 1)
  const found = new Set<string>()

  for (const token of tokens) {
    if (KEYWORD_TERMS.has(token)) continue
    const direct = aliasToArchetype.get(token)
    if (direct) found.add(direct)
    else {
      for (const [alias, id] of aliasToArchetype) {
        if (fuzzyAliasMatch(token, alias)) found.add(id)
      }
    }
  }

  const joined = normalized.replace(/\s+/g, '')
  for (const a of ARCHETYPES) {
    for (const alias of a.aliases) {
      const key = alias.replace(/\s+/g, '')
      if (joined.includes(key) || normalized.includes(alias)) found.add(a.id)
    }
  }

  return [...found]
}

export function archetypeById(id: string): ArchetypeDef | undefined {
  return ARCHETYPES.find((a) => a.id === id)
}
