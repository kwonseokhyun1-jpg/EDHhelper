/**
 * MTG keyword ability definitions for prompt matching and result explanations.
 * Scryfall keyword strings may differ slightly (e.g. "Double strike" vs "double strike").
 */

import { normalizeWithTypos } from './fuzzy-text'

export type KeywordDef = {
  id: string
  /** Display name */
  name: string
  /** Strings as they appear on Scryfall card.keywords */
  scryfallNames: string[]
  /** Aliases players type in search prompts */
  aliases: string[]
  meaning: string
  /** Related deck archetype tags (commander-match tags) */
  tags?: string[]
}

/** Core evergreen and commonly searched mechanics */
export const KEYWORD_DEFS: KeywordDef[] = [
  {
    id: 'flying',
    name: 'Flying',
    scryfallNames: ['Flying'],
    aliases: ['flying', 'flyer', 'flyers'],
    meaning: 'Can only be blocked by creatures with flying or reach.',
    tags: ['voltron'],
  },
  {
    id: 'trample',
    name: 'Trample',
    scryfallNames: ['Trample'],
    aliases: ['trample'],
    meaning: 'Excess combat damage is dealt to the player or planeswalker being attacked.',
    tags: ['voltron', 'combat'],
  },
  {
    id: 'deathtouch',
    name: 'Deathtouch',
    scryfallNames: ['Deathtouch'],
    aliases: ['deathtouch'],
    meaning: 'Any amount of damage this deals to a creature is enough to destroy it.',
    tags: ['control'],
  },
  {
    id: 'lifelink',
    name: 'Lifelink',
    scryfallNames: ['Lifelink'],
    aliases: ['lifelink'],
    meaning: 'Damage dealt by this source also causes you to gain that much life.',
    tags: ['lifegain'],
  },
  {
    id: 'hexproof',
    name: 'Hexproof',
    scryfallNames: ['Hexproof', 'Hexproof from'],
    aliases: ['hexproof'],
    meaning: 'Cannot be the target of spells or abilities your opponents control.',
    tags: ['voltron', 'protection'],
  },
  {
    id: 'indestructible',
    name: 'Indestructible',
    scryfallNames: ['Indestructible'],
    aliases: ['indestructible', 'indestructable'],
    meaning: 'Damage and "destroy" effects do not destroy this permanent.',
    tags: ['voltron', 'protection'],
  },
  {
    id: 'ward',
    name: 'Ward',
    scryfallNames: ['Ward'],
    aliases: ['ward'],
    meaning: 'Whenever this becomes the target of a spell or ability an opponent controls, counter it unless that player pays the ward cost.',
    tags: ['protection'],
  },
  {
    id: 'menace',
    name: 'Menace',
    scryfallNames: ['Menace'],
    aliases: ['menace'],
    meaning: 'Cannot be blocked except by two or more creatures.',
    tags: ['combat', 'aggro'],
  },
  {
    id: 'vigilance',
    name: 'Vigilance',
    scryfallNames: ['Vigilance'],
    aliases: ['vigilance'],
    meaning: 'Attacking does not cause this creature to tap.',
    tags: ['voltron', 'combat'],
  },
  {
    id: 'haste',
    name: 'Haste',
    scryfallNames: ['Haste'],
    aliases: ['haste'],
    meaning: 'Can attack and use tap abilities the turn it enters.',
    tags: ['aggro', 'combat'],
  },
  {
    id: 'reach',
    name: 'Reach',
    scryfallNames: ['Reach'],
    aliases: ['reach'],
    meaning: 'Can block creatures with flying.',
    tags: ['control'],
  },
  {
    id: 'first-strike',
    name: 'First strike',
    scryfallNames: ['First strike'],
    aliases: ['first strike', 'first-strike'],
    meaning: 'Deals combat damage before creatures without first strike or double strike.',
    tags: ['combat'],
  },
  {
    id: 'double-strike',
    name: 'Double strike',
    scryfallNames: ['Double strike'],
    aliases: ['double strike', 'double-strike'],
    meaning: 'Deals first-strike damage and regular combat damage.',
    tags: ['voltron', 'combat'],
  },
  {
    id: 'defender',
    name: 'Defender',
    scryfallNames: ['Defender'],
    aliases: ['defender'],
    meaning: 'Cannot attack.',
    tags: ['control', 'stax'],
  },
  {
    id: 'flash',
    name: 'Flash',
    scryfallNames: ['Flash'],
    aliases: ['flash'],
    meaning: 'Can be cast any time you could cast an instant.',
    tags: ['control', 'spellslinger'],
  },
  {
    id: 'shroud',
    name: 'Shroud',
    scryfallNames: ['Shroud'],
    aliases: ['shroud'],
    meaning: 'Cannot be the target of spells or abilities.',
    tags: ['protection'],
  },
  {
    id: 'protection',
    name: 'Protection',
    scryfallNames: ['Protection'],
    aliases: ['protection'],
    meaning: 'Cannot be blocked, targeted, damaged, or enchanted/equipped by sources with the stated quality.',
    tags: ['protection', 'voltron'],
  },
  {
    id: 'landfall',
    name: 'Landfall',
    scryfallNames: ['Landfall'],
    aliases: ['landfall'],
    meaning: 'Triggers whenever a land enters the battlefield under your control.',
    tags: ['lands'],
  },
  {
    id: 'cascade',
    name: 'Cascade',
    scryfallNames: ['Cascade'],
    aliases: ['cascade'],
    meaning: 'When you cast this spell, exile cards from the top of your library until you exile a nonland card you can cast for less; cast it without paying its mana cost.',
    tags: ['cascade', 'big-mana'],
  },
  {
    id: 'prowess',
    name: 'Prowess',
    scryfallNames: ['Prowess'],
    aliases: ['prowess'],
    meaning: 'Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.',
    tags: ['spellslinger'],
  },
  {
    id: 'scry',
    name: 'Scry',
    scryfallNames: ['Scry'],
    aliases: ['scry'],
    meaning: 'Look at the top card(s) of your library; put any number on the bottom and the rest on top.',
    tags: ['control'],
  },
  {
    id: 'surveil',
    name: 'Surveil',
    scryfallNames: ['Surveil'],
    aliases: ['surveil'],
    meaning: 'Look at the top card(s) of your library; put any number into your graveyard and the rest on top.',
    tags: ['graveyard', 'spellslinger'],
  },
  {
    id: 'explore',
    name: 'Explore',
    scryfallNames: ['Explore'],
    aliases: ['explore'],
    meaning: 'Reveal the top card; if it is a land, put it into your hand. Otherwise put a +1/+1 counter on the exploring creature, then you may put the card into your graveyard.',
    tags: ['counters', 'lands'],
  },
  {
    id: 'convoke',
    name: 'Convoke',
    scryfallNames: ['Convoke'],
    aliases: ['convoke'],
    meaning: 'Tap untapped creatures you control to help pay for this spell.',
    tags: ['tokens', 'go-wide'],
  },
  {
    id: 'delirium',
    name: 'Delirium',
    scryfallNames: ['Delirium'],
    aliases: ['delirium'],
    meaning: 'Bonus effect if there are four or more card types among cards in your graveyard.',
    tags: ['graveyard'],
  },
  {
    id: 'extort',
    name: 'Extort',
    scryfallNames: ['Extort'],
    aliases: ['extort'],
    meaning: 'Whenever you cast a spell, you may pay white; each opponent loses 1 life and you gain that much life.',
    tags: ['lifegain', 'drain'],
  },
  {
    id: 'mentor',
    name: 'Mentor',
    scryfallNames: ['Mentor'],
    aliases: ['mentor'],
    meaning: 'When this creature attacks, put a +1/+1 counter on target attacking creature with lesser power.',
    tags: ['counters', 'go-wide'],
  },
  {
    id: 'riot',
    name: 'Riot',
    scryfallNames: ['Riot'],
    aliases: ['riot'],
    meaning: 'This creature enters with your choice of a +1/+1 counter or haste.',
    tags: ['counters', 'aggro'],
  },
  {
    id: 'proliferate',
    name: 'Proliferate',
    scryfallNames: ['Proliferate'],
    aliases: ['proliferate'],
    meaning: 'Choose any number of permanents and/or players, then give each another counter of each kind already there.',
    tags: ['counters', 'infect'],
  },
  {
    id: 'infect',
    name: 'Infect',
    scryfallNames: ['Infect'],
    aliases: ['infect'],
    meaning: 'Deals damage to creatures in the form of -1/-1 counters and to players in the form of poison counters.',
    tags: ['infect'],
  },
  {
    id: 'mill',
    name: 'Mill',
    scryfallNames: ['Mill'],
    aliases: ['mill', 'milling'],
    meaning: 'Put cards from the top of a library into its owner\'s graveyard.',
    tags: ['mill'],
  },
  {
    id: 'flashback',
    name: 'Flashback',
    scryfallNames: ['Flashback'],
    aliases: ['flashback'],
    meaning: 'Cast this card from your graveyard for its flashback cost, then exile it.',
    tags: ['graveyard', 'spellslinger'],
  },
  {
    id: 'madness',
    name: 'Madness',
    scryfallNames: ['Madness'],
    aliases: ['madness'],
    meaning: 'If you discard this card, you may cast it for its madness cost.',
    tags: ['discard', 'graveyard'],
  },
  {
    id: 'kicker',
    name: 'Kicker',
    scryfallNames: ['Kicker', 'Multikicker'],
    aliases: ['kicker', 'multikicker'],
    meaning: 'Optional additional cost(s) when casting for extra effects.',
    tags: ['spellslinger'],
  },
  {
    id: 'partner',
    name: 'Partner',
    scryfallNames: ['Partner'],
    aliases: ['partner'],
    meaning: 'You can have two commanders if both have Partner (or compatible partner abilities).',
    tags: ['partners'],
  },
  {
    id: 'partner-with',
    name: 'Partner with',
    scryfallNames: ['Partner with'],
    aliases: ['partner with'],
    meaning: 'Partner with a specific named commander — only that pair is legal together.',
    tags: ['partners'],
  },
  {
    id: 'friends-forever',
    name: 'Friends forever',
    scryfallNames: ['Friends forever'],
    aliases: ['friends forever'],
    meaning: 'Doctor Who mechanic — pair with another Friends forever commander.',
    tags: ['partners'],
  },
  {
    id: 'choose-background',
    name: 'Choose a Background',
    scryfallNames: ['Choose a background'],
    aliases: ['choose a background', 'background commander', 'background'],
    meaning: 'Pair this commander with a Background enchantment commander.',
    tags: ['partners'],
  },
  {
    id: 'doctors-companion',
    name: "Doctor's companion",
    scryfallNames: ["Doctor's companion"],
    aliases: ["doctor's companion", 'doctors companion'],
    meaning: 'Pair with a Doctor Who commander that has Doctor\'s companion.',
    tags: ['partners'],
  },
  {
    id: 'eminence',
    name: 'Eminence',
    scryfallNames: ['Eminence'],
    aliases: ['eminence'],
    meaning: 'Ability works in the command zone as well as on the battlefield.',
    tags: ['command-zone'],
  },
  {
    id: 'myriad',
    name: 'Myriad',
    scryfallNames: ['Myriad'],
    aliases: ['myriad'],
    meaning: 'When this creature attacks, create a token copy tapped and attacking each opponent.',
    tags: ['combat', 'tokens'],
  },
  {
    id: 'encore',
    name: 'Encore',
    scryfallNames: ['Encore'],
    aliases: ['encore'],
    meaning: 'Pay mana to create token copies of this creature for each opponent, attacking them.',
    tags: ['tokens', 'combat'],
  },
  {
    id: 'ninjutsu',
    name: 'Ninjutsu',
    scryfallNames: ['Ninjutsu', 'Commander ninjutsu'],
    aliases: ['ninjutsu'],
    meaning: 'Return an unblocked attacker to hand to put this creature onto the battlefield tapped and attacking.',
    tags: ['combat', 'evasion'],
  },
  {
    id: 'equip',
    name: 'Equip',
    scryfallNames: ['Equip'],
    aliases: ['equip', 'equipment'],
    meaning: 'Attach this Equipment to target creature you control by paying its equip cost.',
    tags: ['voltron'],
  },
  {
    id: 'enchant',
    name: 'Enchant',
    scryfallNames: ['Enchant'],
    aliases: ['enchant', 'aura'],
    meaning: 'Aura spells target a permanent or player when cast.',
    tags: ['voltron', 'enchantments'],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    scryfallNames: ['Constellation'],
    aliases: ['constellation'],
    meaning: 'Triggers whenever an enchantment enters the battlefield under your control.',
    tags: ['enchantments'],
  },
  {
    id: 'enrage',
    name: 'Enrage',
    scryfallNames: ['Enrage'],
    aliases: ['enrage'],
    meaning: 'Triggers whenever this creature is dealt damage.',
    tags: ['combat', 'counters'],
  },
  {
    id: 'undying',
    name: 'Undying',
    scryfallNames: ['Undying'],
    aliases: ['undying'],
    meaning: 'When this creature dies, return it with a +1/+1 counter if it had none.',
    tags: ['graveyard', 'counters'],
  },
  {
    id: 'persist',
    name: 'Persist',
    scryfallNames: ['Persist'],
    aliases: ['persist'],
    meaning: 'When this creature dies, return it with a -1/-1 counter if it had none.',
    tags: ['graveyard', 'aristocrats'],
  },
  {
    id: 'escape',
    name: 'Escape',
    scryfallNames: ['Escape'],
    aliases: ['escape'],
    meaning: 'Cast from the graveyard by exiling other cards from your graveyard.',
    tags: ['graveyard'],
  },
  {
    id: 'disturb',
    name: 'Disturb',
    scryfallNames: ['Disturb'],
    aliases: ['disturb'],
    meaning: 'Cast the back face from the graveyard for its disturb cost.',
    tags: ['graveyard'],
  },
  {
    id: 'embalm',
    name: 'Embalm',
    scryfallNames: ['Embalm'],
    aliases: ['embalm'],
    meaning: 'Create a token copy of this card by paying its embalm cost from your hand or graveyard.',
    tags: ['tokens', 'graveyard'],
  },
  {
    id: 'mutate',
    name: 'Mutate',
    scryfallNames: ['Mutate'],
    aliases: ['mutate'],
    meaning: 'Stack this creature on a non-Human creature you control as a mutating creature spell.',
    tags: ['counters', 'combat'],
  },
  {
    id: 'blitz',
    name: 'Blitz',
    scryfallNames: ['Blitz'],
    aliases: ['blitz'],
    meaning: 'Alternative cast cost; creature gains haste and is sacrificed at end of turn.',
    tags: ['aggro', 'aristocrats'],
  },
  {
    id: 'dash',
    name: 'Dash',
    scryfallNames: ['Dash'],
    aliases: ['dash'],
    meaning: 'Cast for an alternate cost; creature gains haste and is returned at end of turn.',
    tags: ['aggro'],
  },
  {
    id: 'morph',
    name: 'Morph',
    scryfallNames: ['Morph'],
    aliases: ['morph'],
    meaning: 'Cast face down as a 2/2 creature for three generic; turn face up for a cost.',
    tags: ['control'],
  },
  {
    id: 'manifest',
    name: 'Manifest',
    scryfallNames: ['Manifest', 'Manifest dread'],
    aliases: ['manifest'],
    meaning: 'Put a card from your library face down as a 2/2 creature; turn it face up for its mana cost.',
    tags: ['cheats'],
  },
  {
    id: 'offering',
    name: 'Offering',
    scryfallNames: ['Offering'],
    aliases: ['offering'],
    meaning: 'You may sacrifice a permanent of the stated type to reduce the spell\'s cost.',
    tags: ['aristocrats'],
  },
  {
    id: 'investigate',
    name: 'Investigate',
    scryfallNames: ['Investigate'],
    aliases: ['investigate', 'clue'],
    meaning: 'Create a Clue token; sacrifice it to draw a card.',
    tags: ['draw'],
  },
  {
    id: 'treasure',
    name: 'Treasure',
    scryfallNames: ['Treasure'],
    aliases: ['treasure'],
    meaning: 'Create Treasure tokens that can be sacrificed for mana.',
    tags: ['ramp', 'artifacts'],
  },
  {
    id: 'food',
    name: 'Food',
    scryfallNames: ['Food'],
    aliases: ['food token'],
    meaning: 'Create Food tokens that can be sacrificed for life.',
    tags: ['lifegain'],
  },
  {
    id: 'battalion',
    name: 'Battalion',
    scryfallNames: ['Battalion'],
    aliases: ['battalion'],
    meaning: 'Triggers when you attack with three or more creatures.',
    tags: ['go-wide', 'tokens'],
  },
  {
    id: 'exalted',
    name: 'Exalted',
    scryfallNames: ['Exalted'],
    aliases: ['exalted'],
    meaning: 'Whenever a creature you control attacks alone, it gets +1/+1 until end of turn.',
    tags: ['voltron'],
  },
  {
    id: 'dethrone',
    name: 'Dethrone',
    scryfallNames: ['Dethrone'],
    aliases: ['dethrone'],
    meaning: 'Triggers when this creature attacks the player with the most life or tied for most.',
    tags: ['politics', 'combat'],
  },
  {
    id: 'monarch',
    name: 'Monarch',
    scryfallNames: [],
    aliases: ['monarch', 'the monarch'],
    meaning: 'At end of your turn, draw a card if you are the monarch; you become monarch when you deal combat damage to the current monarch.',
    tags: ['politics', 'draw'],
  },
  {
    id: 'venture',
    name: 'Venture into the dungeon',
    scryfallNames: ['Venture into the dungeon'],
    aliases: ['venture', 'dungeon'],
    meaning: 'Enter the dungeon or advance to the next room for a bonus effect.',
    tags: ['value'],
  },
  {
    id: 'cycling',
    name: 'Cycling',
    scryfallNames: ['Cycling'],
    aliases: ['cycling'],
    meaning: 'Discard this card and pay its cycling cost to draw a card (or get another effect).',
    tags: ['draw'],
  },
  {
    id: 'suspend',
    name: 'Suspend',
    scryfallNames: ['Suspend'],
    aliases: ['suspend'],
    meaning: 'Exile this card with time counters; cast it without paying mana when the last counter is removed.',
    tags: ['spellslinger'],
  },
  {
    id: 'storm',
    name: 'Storm',
    scryfallNames: ['Storm'],
    aliases: ['storm'],
    meaning: 'Copy this spell for each spell cast before it this turn.',
    tags: ['spellslinger', 'combo'],
  },
  {
    id: 'overload',
    name: 'Overload',
    scryfallNames: [],
    aliases: ['overload'],
    meaning: 'Alternate cost that changes "target" to "each" for that spell.',
    tags: ['spellslinger'],
  },
  {
    id: 'foretell',
    name: 'Foretell',
    scryfallNames: [],
    aliases: ['foretell'],
    meaning: 'During your turn, exile this card from your hand face down for two generic; cast it on a later turn for its foretell cost.',
    tags: ['spellslinger', 'control'],
  },
  {
    id: 'harmonize',
    name: 'Harmonize',
    scryfallNames: [],
    aliases: ['harmonize'],
    meaning: 'You may cast this as though it had flash if you also cast a creature spell this turn (Tarkir mechanic).',
    tags: ['spellslinger'],
  },
  {
    id: 'craft',
    name: 'Craft',
    scryfallNames: ['Craft'],
    aliases: ['craft'],
    meaning: 'Exile an artifact you control or in your graveyard as an additional cost to turn this permanent face up.',
    tags: ['artifacts'],
  },
  {
    id: 'plot',
    name: 'Plot',
    scryfallNames: ['Plot'],
    aliases: ['plot'],
    meaning: 'Exile this card face down; cast it on a later turn without paying its mana cost.',
    tags: ['spellslinger', 'graveyard'],
  },
  {
    id: 'spectacle',
    name: 'Spectacle',
    scryfallNames: [],
    aliases: ['spectacle'],
    meaning: 'Alternate cost if an opponent lost life this turn.',
    tags: ['aggro'],
  },
  {
    id: 'populate',
    name: 'Populate',
    scryfallNames: ['Populate'],
    aliases: ['populate'],
    meaning: 'Create a token copy of a creature token you control.',
    tags: ['tokens'],
  },
  {
    id: 'evolve',
    name: 'Evolve',
    scryfallNames: ['Evolve'],
    aliases: ['evolve'],
    meaning: 'Whenever a creature enters under your control with greater power or toughness, put a +1/+1 counter on this creature.',
    tags: ['counters'],
  },
  {
    id: 'adapt',
    name: 'Adapt',
    scryfallNames: ['Adapt'],
    aliases: ['adapt'],
    meaning: 'If this creature has no +1/+1 counters, put a +1/+1 counter on it.',
    tags: ['counters'],
  },
  {
    id: 'training',
    name: 'Training',
    scryfallNames: ['Training'],
    aliases: ['training'],
    meaning: 'When a creature with greater power attacks with this creature, put a +1/+1 counter on this creature.',
    tags: ['counters', 'go-wide'],
  },
  {
    id: 'backup',
    name: 'Backup',
    scryfallNames: ['Backup'],
    aliases: ['backup'],
    meaning: 'Put +1/+1 counters on this creature, then copy its non-creature abilities onto another target creature.',
    tags: ['counters'],
  },
  {
    id: 'toxic',
    name: 'Toxic',
    scryfallNames: ['Toxic'],
    aliases: ['toxic'],
    meaning: 'Combat damage to players also gives poison counters (often fewer needed than infect).',
    tags: ['infect'],
  },
  {
    id: 'companion',
    name: 'Companion',
    scryfallNames: ['Companion'],
    aliases: ['companion'],
    meaning: 'Special deck-building restriction; can be cast from outside the game if your deck satisfies the condition.',
    tags: ['build-around'],
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    scryfallNames: ['Annihilator'],
    aliases: ['annihilator'],
    meaning: 'Whenever this creature attacks, defending player sacrifices that many permanents.',
    tags: ['combat', 'stax'],
  },
  {
    id: 'prowess-like',
    name: 'Magecraft',
    scryfallNames: ['Magecraft'],
    aliases: ['magecraft'],
    meaning: 'Triggers whenever you cast or copy an instant or sorcery spell.',
    tags: ['spellslinger'],
  },
]

const KEYWORD_BY_ID = new Map(KEYWORD_DEFS.map((k) => [k.id, k]))

function normalizeKeyword(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

function cardHasKeyword(cardKeywords: string[], def: KeywordDef): boolean {
  const normalizedCard = cardKeywords.map((k) => k.toLowerCase())
  for (const name of def.scryfallNames) {
    const n = name.toLowerCase()
    if (normalizedCard.some((ck) => ck === n || ck.startsWith(`${n} `))) return true
  }
  return false
}

function oracleReferencesKeyword(oracle: string, def: KeywordDef): boolean {
  const lower = oracle.toLowerCase()
  for (const alias of def.aliases) {
    if (lower.includes(alias)) return true
  }
  for (const name of def.scryfallNames) {
    if (lower.includes(name.toLowerCase())) return true
  }
  return false
}

/** Keywords mentioned in a user prompt (theme or card search). */
export function detectKeywordsInText(text: string): KeywordDef[] {
  const { text: normalized } = normalizeWithTypos(text)
  const padded = ` ${normalized} `
  const found: KeywordDef[] = []

  for (const def of KEYWORD_DEFS) {
    let matched = false
    for (const alias of def.aliases) {
      const a = normalizeKeyword(alias)
      if (padded.includes(` ${a} `) || normalized === a) {
        matched = true
        break
      }
    }
    if (matched && !found.some((f) => f.id === def.id)) found.push(def)
  }

  return found
}

export function keywordById(id: string): KeywordDef | undefined {
  return KEYWORD_BY_ID.get(id)
}

export function describeDetectedKeywords(text: string): string {
  const kws = detectKeywordsInText(text)
  if (kws.length === 0) return ''
  return kws.map((k) => `${k.name}: ${k.meaning}`).join(' · ')
}

export function scoreCommanderKeywords(
  commander: { keywords: string[]; oracle_text: string },
  detected: KeywordDef[],
): { score: number; reasons: string[]; matchedKeywordIds: string[] } {
  let score = 0
  const reasons: string[] = []
  const matchedKeywordIds: string[] = []

  for (const def of detected) {
    if (cardHasKeyword(commander.keywords, def)) {
      score += 26
      matchedKeywordIds.push(def.id)
      reasons.push(`Has ${def.name} — ${def.meaning}`)
    } else if (oracleReferencesKeyword(commander.oracle_text, def)) {
      score += 11
      matchedKeywordIds.push(def.id)
      reasons.push(`Synergizes with ${def.name}`)
    }
  }

  return { score, reasons, matchedKeywordIds }
}

export function scoreCardKeywords(
  card: { keywords: string[]; oracle_text: string; type_line: string },
  detected: KeywordDef[],
): { score: number; reason: string } | null {
  if (detected.length === 0) return null

  const matched: string[] = []
  for (const def of detected) {
    if (cardHasKeyword(card.keywords, def)) {
      matched.push(def.name)
    }
  }

  if (matched.length === 0) return null

  const score = Math.min(98, 68 + matched.length * 14)
  return {
    score,
    reason: `Has ${matched.join(', ')}`,
  }
}
