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
    aliases: ['stax', 'tax', 'taxes'],
    signals: [
      /unless (?:that player|an opponent|(?:the )?target opponent|the attacking player|its controller|their controller|that creature's controller|they) pays?/i,
      /can't attack (?:you )?unless/i,
      /can't attack unless/i,
      /can't cast (?:noncreature )?spells?/i,
      /skip .* (?:combat|draw|upkeep)/i,
      /don't untap/i,
      /costs? \{[^}]+\} more to cast/i,
      /spells? cost .* more/i,
      /activated abilities cost .* more/i,
      /each player may attack only/i,
      /creatures can't attack you/i,
    ],
    excludeSignals: [
      /each opponent (?:loses|mills|discards|sacrifices|creates|draws|gains|exiles)/i,
      /deals? .* damage to each opponent/i,
      /each opponent (?:loses|gains) .* life/i,
      /unless you pay/i,
    ],
  },
  {
    id: 'tokens',
    aliases: ['token', 'tokens', 'wide', 'go-wide', 'army', 'swarm'],
    signals: [/create .* token/i, /token creatures? you control/i, /populate/i],
  },
  {
    id: 'aristocrats',
    aliases: ['aristocrats', 'aristocrat', 'sacrifice', 'sac', 'dies', 'death'],
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
    aliases: ['group-hug', 'grouphug'],
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
    id: 'wheel',
    aliases: ['wheel', 'wheels', 'punisher', 'draw punish'],
    signals: [
      /each player discards? (?:their )?hand/i,
      /each player discards? .{0,100}draws?/is,
      /each player draws? seven cards/i,
      /at the beginning of each player'?s? draw step.{0,120}draws? an additional/i,
      /whenever an opponent draws?/i,
      /whenever a player draws? a card/i,
      /whenever another player draws?/i,
      /for each card (?:your )?opponents have drawn/i,
      /(?:opponents|each opponent) draw .{0,40}additional card/i,
    ],
    excludeSignals: [
      /you may cast any number of spells from among/i,
      /exile the top .* of (?:their|target opponent)/i,
      /cast .* from (?:an )?opponent/i,
    ],
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
    aliases: ['blink', 'flicker', 'etb'],
    signals: [
      /exile .* return .* to the battlefield/i,
      /exile .* then return/i,
      /flicker/i,
      /when .* enters the battlefield.{0,120}exile/i,
    ],
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
    id: 'theft',
    aliases: ['theft', 'impulse', 'robbery'],
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
    id: 'graveyard',
    aliases: ['reanimator', 'reanimate', 'recursion'],
    signals: [
      /from (?:your |a |any )?graveyard to the battlefield/i,
      /from (?:your |a |any )?graveyard onto the battlefield/i,
      /return target .* from (?:your |a )?graveyard to the battlefield/i,
      /put target .* from (?:your |a |any )?graveyard onto the battlefield/i,
      /(?:in|from) (?:your |a )?graveyard.{0,160}return .* to the battlefield/is,
      /return target (?:artifact|creature|permanent|enchantment|planeswalker|land) card from (?:your |a )?graveyard/i,
      /creature card in (?:your |a )?graveyard.{0,120}return it to the battlefield/is,
      /may cast (?:a )?(?:creature|permanent) spell from your graveyard/i,
      /play (?:a )?land and cast (?:a )?permanent spell.{0,80}from your graveyard/i,
    ],
    excludeSignals: [
      /mill(?: \d+ cards?)?/i,
      /\bdredge\b/i,
      /whenever .* discards?/i,
      /(?:may )?discard (?:a |two |cards)/i,
      /put .* cards? .* into (?:their |a )?graveyard/i,
      /you may cast any number of spells from among/i,
      /exile the top .* of (?:their|target opponent)/i,
      /cast .* from (?:an )?opponent/i,
    ],
  },
  {
    id: 'combat',
    aliases: ['aggro', 'attack', 'combat', 'damage', 'beatdown'],
    signals: [/attacks?/i, /combat damage/i, /can't be blocked/i],
  },
  {
    id: 'control',
    aliases: ['control', 'counterspell', 'counter', 'permission'],
    signals: [/counter target (?:spell|ability|noncreature)/i, /destroy target/i, /exile target/i],
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
  const text = `${card.name} ${card.type_line} ${oracleText(card)}`
  const lower = text.toLowerCase()
  const flat = text.replace(/\n/g, ' ')
  const cleaned = flat.replace(/\([^)]*\)/g, ' ')
  const tags = new Set()
  for (const arch of ARCHETYPES) {
    if (arch.excludeSignals?.some((re) => re.test(cleaned))) continue
    const signalHit = arch.signals.some((re) => re.test(cleaned))
    const aliasHit = arch.aliases.some((a) => aliasMatchesText(lower, a))
    if (signalHit || aliasHit) tags.add(arch.id)
  }
  return [...tags]
}

function aliasMatchesText(text, alias) {
  const a = alias.toLowerCase()
  if (a.includes('-') || a.includes(' ')) {
    return text.includes(a)
  }
  return new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
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

export function slimCardFaces(card) {
  const faces = card.card_faces
  if (!faces?.length || faces.length < 2) return undefined
  return faces.map((f) => ({
    name: f.name,
    type_line: f.type_line ?? '',
    oracle_text: f.oracle_text ?? '',
    mana_cost: f.mana_cost,
    image: f.image_uris?.normal,
  }))
}

export function slimCard(card) {
  const text = oracleText(card)
  const cardFaces = slimCardFaces(card)
  const slim = {
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
  if (cardFaces) slim.card_faces = cardFaces
  return slim
}
