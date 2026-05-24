/** Shared archetype + deck role tagging for build scripts */

export function canonicalCardName(name) {
  const trimmed = (name ?? '').trim()
  const parts = trimmed.split(/\s*\/\/\s*/)
  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    return parts[0].trim()
  }
  return trimmed
}

export const ARCHETYPES = [
  {
    id: 'stax',
    aliases: ['stax', 'tax', 'taxes', 'prison', 'resource', 'denial', 'hate', 'lock'],
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
    aliases: ['token', 'tokens', 'wide', 'go-wide', 'army', 'swarm'],
    signals: [/create .* token/i, /token creatures? you control/i, /populate/i],
  },
  {
    id: 'aristocrats',
    aliases: ['aristocrats', 'sacrifice', 'sac', 'dies', 'death', 'graveyard'],
    signals: [/sacrifice (a|another|other)/i, /whenever .* dies/i, /dies, .* (draw|damage|create)/i],
  },
  {
    id: 'lands',
    aliases: ['lands', 'landfall', 'ramp', 'terrain'],
    signals: [/landfall/i, /lands? you control/i, /play .* land/i, /search your library for .* land/i],
  },
  {
    id: 'spellslinger',
    aliases: ['spellslinger', 'instants', 'sorcery', 'cast', 'storm', 'mage'],
    signals: [/instant or sorcery/i, /whenever you cast/i, /magecraft/i, /storm/i],
  },
  {
    id: 'counters',
    aliases: ['counter', 'counters', '+1/+1', 'grow', 'proliferate'],
    signals: [/\+1\/\+1 counter/i, /proliferate/i, /double .* counters/i],
  },
  {
    id: 'voltron',
    aliases: ['voltron', 'equipment', 'aura', 'enchant', 'combat'],
    signals: [/equipped creature/i, /equipment/i, /enchant(ed)? creature/i],
  },
  {
    id: 'group-hug',
    aliases: ['group', 'hug', 'politics', 'everyone', 'each player'],
    signals: [/each player (draws?|may|gains)/i, /all players/i],
  },
  {
    id: 'tribal',
    aliases: [
      'tribal',
      'tribe',
      'elf',
      'elves',
      'goblin',
      'zombie',
      'dragon',
      'merfolk',
      'vampire',
      'sliver',
      'slivers',
    ],
    signals: [
      /(elf|elves|goblin|zombie|dragon|merfolk|vampire|sliver|soldier|warrior|wizard)s? you control/i,
      /other .* you control get/i,
    ],
  },
  {
    id: 'blink',
    aliases: ['blink', 'flicker', 'exile', 'return', 'etb'],
    signals: [/exile .* return/i, /enters the battlefield/i, /leaves the battlefield/i],
  },
  {
    id: 'combo',
    aliases: ['combo', 'infinite', 'win', 'untap'],
    signals: [/untap .* (creatures?|permanents?)/i, /win the game/i, /infinite/i],
  },
  {
    id: 'lifegain',
    aliases: ['lifegain', 'life', 'gain life', 'drain', 'extort'],
    signals: [/gain .* life/i, /you gain life/i, /extort/i],
  },
  {
    id: 'artifacts',
    aliases: ['artifacts', 'artifact', 'affinity', 'treasure'],
    signals: [/artifact/i, /treasure token/i, /affinity for artifacts/i],
  },
  {
    id: 'enchantments',
    aliases: ['enchantments', 'enchantment', 'constellation', 'shrines'],
    signals: [/enchantment/i, /constellation/i, /shrine/i],
  },
  {
    id: 'graveyard',
    aliases: ['reanimator', 'reanimate', 'mill', 'discard'],
    signals: [/from (your |a )?graveyard/i, /mill/i, /discard/i, /return .* graveyard/i],
  },
  {
    id: 'combat',
    aliases: ['aggro', 'attack', 'combat', 'damage', 'beatdown'],
    signals: [/attacks?/i, /combat damage/i, /can't be blocked/i],
  },
  {
    id: 'control',
    aliases: ['control', 'counterspell', 'counter', 'permission'],
    signals: [/counter target/i, /return target/i, /destroy target/i],
  },
  {
    id: 'treasure',
    aliases: ['treasure', 'mana', 'rocks', 'ramp'],
    signals: [/treasure token/i, /add \{[wubrgc]/i],
  },
]

/** Deck-building roles used for upgrade suggestions */
export const ROLES = [
  {
    id: 'ramp',
    label: 'Mana ramp',
    signals: [
      /search your library for (a |up to .* )?.* land/i,
      /put .* land .* onto the battlefield/i,
      /add \{[wubrgc]/i,
      /create .* Treasure token/i,
      /mana rock/i,
    ],
    types: [/artifact/i, /land/i, /creature/i],
  },
  {
    id: 'draw',
    label: 'Card draw',
    signals: [
      /draw (a |one |two |three |cards)/i,
      /draws? cards? equal to/i,
      /investigate/i,
      /connive/i,
      /impulse/i,
      /surveil \d/i,
    ],
    types: [/instant/i, /sorcery/i, /enchantment/i, /creature/i, /planeswalker/i],
  },
  {
    id: 'removal',
    label: 'Targeted removal',
    signals: [
      /destroy target/i,
      /exile target/i,
      /return target .* to its owner's hand/i,
      /\-\d+\/-\d+ until end of turn/i,
      /fight target/i,
    ],
    types: [/instant/i, /sorcery/i, /enchantment/i, /creature/i],
  },
  {
    id: 'wipe',
    label: 'Board wipe',
    signals: [
      /destroy all creatures/i,
      /destroy all nonland/i,
      /destroy all permanents/i,
      /each creature gets -\d+\/-\d+/i,
      /damage to each creature/i,
    ],
    types: [/instant/i, /sorcery/i, /planeswalker/i],
  },
  {
    id: 'tutor',
    label: 'Tutors',
    signals: [
      /search your library for (?!.*\bland\b)/i,
      /search your library for a card/i,
    ],
    types: [/instant/i, /sorcery/i, /enchantment/i, /artifact/i],
  },
  {
    id: 'protection',
    label: 'Protection',
    signals: [
      /hexproof/i,
      /indestructible/i,
      /protection from/i,
      /counter target (spell|ability)/i,
      /shroud/i,
    ],
    types: [/instant/i, /enchantment/i, /artifact/i],
  },
  {
    id: 'recursion',
    label: 'Recursion',
    signals: [
      /return .* from (your |a )?graveyard/i,
      /cast .* from your graveyard/i,
      /retrace/i,
      /flashback/i,
    ],
    types: [/instant/i, /sorcery/i, /enchantment/i, /creature/i],
  },
]

export function oracleText(card) {
  if (card.oracle_text) return card.oracle_text
  return (card.card_faces ?? []).map((f) => f.oracle_text ?? '').join('\n')
}

export function deriveTags(card) {
  const text = `${card.name} ${card.type_line} ${oracleText(card)}`.toLowerCase()
  const tags = new Set()
  for (const arch of ARCHETYPES) {
    if (arch.signals.some((re) => re.test(text))) tags.add(arch.id)
    if (arch.aliases.some((a) => text.includes(a))) tags.add(arch.id)
  }
  return [...tags]
}

export function deriveRoles(card) {
  const text = `${oracleText(card)} ${card.type_line}`
  const typeLine = card.type_line ?? ''
  const roles = new Set()

  if (typeLine.toLowerCase().includes('land') && !/destroy all/i.test(text)) {
    return [] // lands tagged separately in ramp logic if needed
  }

  for (const role of ROLES) {
    const typeOk = role.types.some((re) => re.test(typeLine))
    if (typeOk && role.signals.some((re) => re.test(text))) roles.add(role.id)
  }

  // Mana rocks / dorks
  if (/add \{[wubrgc]/.test(text) && /artifact|creature/.test(typeLine)) roles.add('ramp')

  return [...roles]
}

export function slimCard(card) {
  const text = oracleText(card)
  return {
    id: card.id,
    name: canonicalCardName(card.name),
    color_identity: card.color_identity ?? [],
    cmc: card.cmc ?? 0,
    mana_cost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost,
    type_line: card.type_line ?? card.card_faces?.[0]?.type_line ?? '',
    oracle_text: text,
    keywords: card.keywords ?? [],
    tags: deriveTags(card),
    roles: deriveRoles(card),
    image:
      card.image_uris?.normal ??
      card.card_faces?.[0]?.image_uris?.normal,
    scryfall_uri: card.scryfall_uri,
    edhrec_rank: card.edhrec_rank,
    game_changer: card.game_changer === true ? true : undefined,
    prices: { usd: card.prices?.usd ?? null },
  }
}
