import type { CardRecord } from '../types/card'
import type { CommanderRecord } from '../types/commander'
import { archetypeById } from './archetypes'

export type DetailItem = {
  id: string
  name: string
  type_line: string
  oracle_text: string
  mana_cost?: string
  cmc: number
  color_identity: string[]
  keywords: string[]
  tags: string[]
  roles: string[]
  image?: string
  scryfall_uri: string
  edhrec_rank?: number
  prices?: { usd?: string | null }
  kind: 'card' | 'commander'
}

export type CardInsight = {
  buildTips: string[]
  synergies: string[]
  deckRoles: string[]
}

const ARCHETYPE_TIPS: Record<string, string> = {
  stax: 'Runs best with asymmetric stax pieces and mana-efficient threats that operate under your own taxes.',
  tokens: 'Include token producers, anthems, and payoffs that reward a wide board before combat.',
  aristocrats: 'Pair with free or repeatable sacrifice outlets and death triggers that convert creatures into value.',
  lands: 'Extra land drops, landfall payoffs, and ways to get lands onto the battlefield increase consistency.',
  spellslinger: 'Low-CMC instants and sorceries plus copy or storm payoffs keep the engine running.',
  counters: 'Use +1/+1 counter enablers, doubling effects, and proliferate to scale creatures quickly.',
  voltron: 'Equipment, auras, and protection keep one threat alive while it grows lethal in combat.',
  'group-hug': 'Balance table-wide effects with a personal win condition so you are not purely enabling others.',
  tribal: 'Focus on lords, shared types in the curve, and redundancy for your creature type.',
  blink: 'ETB creatures with strong enters triggers plus blink/flicker effects generate repeated value.',
  combo: 'Include tutors and redundancy; make sure each combo line has protection or an alternate win.',
  lifegain: 'Combine life gain with payoffs that convert life total into cards, mana, or damage.',
  artifacts: 'Artifact mana rocks, cost reducers, and payoffs that care about artifacts increase synergy.',
  enchantments: 'Enchantment recursion, constellation payoffs, and enchantress effects scale the plan.',
  graveyard: 'Self-mill, discard outlets, and recursion let you treat the graveyard as a second hand.',
  combat: 'Haste enablers, extra combat steps, and evasion help close games before opponents stabilize.',
  control: 'Interaction, card draw, and a small number of finishers keep you ahead while you answer threats.',
  treasure: 'Treasure producers and sacrifice payoffs turn artifacts into mana and card advantage.',
}

const ROLE_LABELS: Record<string, string> = {
  ramp: 'Mana ramp',
  draw: 'Card draw',
  removal: 'Targeted removal',
  wipe: 'Board wipe',
  tutor: 'Tutor',
  protection: 'Protection',
  recursion: 'Recursion',
}

const ORACLE_SYNERGIES: Array<{ test: RegExp; text: string }> = [
  {
    test: /whenever you cast an instant or sorcery|magecraft|prowess/i,
    text: 'Spellslinger decks benefit from cheap instants/sorceries and copy effects.',
  },
  {
    test: /landfall/i,
    text: 'Extra land drops and land recursion increase landfall trigger count.',
  },
  {
    test: /whenever .* dies|sacrifice (a|another|other)/i,
    text: 'Sacrifice outlets and death triggers convert creatures into repeated value.',
  },
  {
    test: /create .* token/i,
    text: 'Token doublers and anthems scale token production into a lethal board.',
  },
  {
    test: /\+1\/\+1 counter|proliferate/i,
    text: 'Counter doublers and proliferate effects accelerate a counters strategy.',
  },
  {
    test: /equip|equipped creature|aura/i,
    text: 'Equipment/aura support and hexproof effects protect your main threat.',
  },
  {
    test: /from (your |a )?graveyard|mill|discard/i,
    text: 'Self-mill and discard outlets fuel graveyard-based strategies.',
  },
  {
    test: /investigate|create .* (Clue|Treasure|Food) token/i,
    text: 'Artifact token payoffs and sacrifice outlets turn tokens into mana or cards.',
  },
  {
    test: /attack|combat damage|can't be blocked/i,
    text: 'Extra combat steps, evasion, and power boosts turn combat into a primary win condition.',
  },
  {
    test: /search your library/i,
    text: 'Tutors and deck thinning improve consistency for the package this card supports.',
  },
  {
    test: /partner|friends forever|choose a background|doctor's companion/i,
    text: 'Build around a compatible second commander that shares your color identity and strategy.',
  },
  {
    test: /can be your commander/i,
    text: 'Build the deck around this card\'s color identity and the themes in its rules text.',
  },
]

/** Factual notes for iconic cards — only statements we can stand behind */
const CARD_NOTES: Record<string, string[]> = {
  'Sol Ring': ['Efficient mana acceleration that fits most Commander decks.'],
  'Rhystic Study': ['Strong draw engine when opponents cast spells — best in decks that can protect it.'],
  'Cyclonic Rift': ['Asymmetric board wipe that rewards having a developed board or mana to overload.'],
  'Craterhoof Behemoth': ['Finisher in creature/token decks that can produce a wide board before casting.'],
  'Dockside Extortionist': ['Scales with opponents\' artifacts and enchantments — banned in some playgroups.'],
  'Demonic Tutor': ['Flexible tutor for any card — strongest in decks with a clear game plan.'],
  'Smothering Tithe': ['Generates Treasures when opponents draw — especially strong in white ramp shells.'],
}

export function commanderToDetail(commander: CommanderRecord): DetailItem {
  return {
    id: commander.id,
    name: commander.name,
    type_line: commander.type_line,
    oracle_text: commander.oracle_text,
    mana_cost: commander.mana_cost,
    cmc: commander.cmc,
    color_identity: commander.color_identity,
    keywords: commander.keywords,
    tags: commander.tags,
    roles: [],
    image: commander.image,
    scryfall_uri: commander.scryfall_uri,
    edhrec_rank: commander.edhrec_rank,
    prices: commander.prices,
    kind: 'commander',
  }
}

export function cardToDetail(card: CardRecord): DetailItem {
  return {
    id: card.id,
    name: card.name,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    mana_cost: card.mana_cost,
    cmc: card.cmc,
    color_identity: card.color_identity,
    keywords: card.keywords,
    tags: card.tags,
    roles: card.roles,
    image: card.image,
    scryfall_uri: card.scryfall_uri,
    edhrec_rank: card.edhrec_rank,
    prices: card.prices,
    kind: 'card',
  }
}

export function generateInsight(item: DetailItem): CardInsight {
  const buildTips: string[] = []
  const synergies: string[] = []
  const seen = new Set<string>()

  const addTip = (tip: string) => {
    if (!seen.has(tip)) {
      seen.add(tip)
      buildTips.push(tip)
    }
  }

  const addSynergy = (s: string) => {
    if (!seen.has(s)) {
      seen.add(s)
      synergies.push(s)
    }
  }

  if (item.kind === 'commander') {
    for (const tagId of item.tags) {
      const arch = archetypeById(tagId)
      const tip = ARCHETYPE_TIPS[tagId]
      if (tip) addTip(`${arch?.label ?? tagId}: ${tip}`)
    }
    if (buildTips.length === 0) {
      addTip('Build around the themes in this commander\'s rules text and color identity.')
    }
  } else {
    for (const roleId of item.roles) {
      const label = ROLE_LABELS[roleId] ?? roleId
      addTip(`Fills the ${label.toLowerCase()} slot — include enough redundancy at this role in your deck.`)
    }
    for (const tagId of item.tags) {
      const tip = ARCHETYPE_TIPS[tagId]
      if (tip) addTip(tip)
    }
  }

  for (const { test, text } of ORACLE_SYNERGIES) {
    if (test.test(item.oracle_text)) addSynergy(text)
  }

  for (const note of CARD_NOTES[item.name] ?? []) {
    addSynergy(note)
  }

  if (item.keywords.length > 0) {
    const kw = item.keywords.slice(0, 4).join(', ')
    addSynergy(`Keywords (${kw}) define how this card interacts in combat and with removal.`)
  }

  const deckRoles = item.roles.map((r) => ROLE_LABELS[r] ?? r)

  return { buildTips: buildTips.slice(0, 4), synergies: synergies.slice(0, 4), deckRoles }
}
