import type { Bracket } from '../types/mtg'
import type { CardRecord } from '../types/card'
import { REANIMATOR_ORACLE, THEFT_ORACLE, WHEEL_ORACLE } from './archetype-patterns'

export type SlangEntry = {
  id: string
  /** Short label shown in search hints */
  label: string
  aliases: RegExp[]
  /** Plain language appended for matching engines */
  expand?: string
  /** Commander names to boost (exact Scryfall names) */
  commanders?: string[]
  /** Famous partner pairs [[primary, partner], ...] */
  partnerPairs?: [string, string][]
  /** Playstyle archetype ids (commander tags) */
  archetypes?: string[]
  /** Bracket shorthand (e.g. cEDH → 5) */
  bracket?: Bracket
  /** Oracle patterns for Find Cards */
  cardOracle?: RegExp[]
  /** Oracle patterns for commander matching */
  commanderOracle?: RegExp[]
  /** Linked jargon id for ability handlers */
  jargonId?: string
}

export type DetectedSlang = {
  entry: SlangEntry
}

/** Community & mechanical slang — curated, no network lookup required. */
export const SLANG: SlangEntry[] = [
  {
    id: 'etb',
    label: 'ETB — enters the battlefield',
    aliases: [/\betb\b/i, /\benters? the battlefield\b/i, /\benter(?:s)? the battlefield\b/i],
    expand: 'enters the battlefield when this enters',
    jargonId: 'etb',
    cardOracle: [/when(?:ever)? .* enters the battlefield/i],
  },
  {
    id: 'ltb',
    label: 'LTB — leaves the battlefield',
    aliases: [/\bltb\b/i, /\bleaves the battlefield\b/i],
    expand: 'leaves the battlefield',
    cardOracle: [/when(?:ever)? .* leaves the battlefield/i],
  },
  {
    id: 'dies',
    label: 'Dies / death trigger',
    aliases: [/\bdies trigger\b/i, /\bwhen .* dies\b/i],
    expand: 'whenever dies death trigger',
    cardOracle: [/when(?:ever)? .* dies/i],
  },
  {
    id: 'gy',
    label: 'Graveyard',
    aliases: [/\bgy\b/i, /\bgraveyard\b/i, /\byard\b/i],
    expand: 'graveyard from your graveyard',
  },
  {
    id: 'pillowfort',
    label: 'Pillowfort — attack taxes & prison',
    aliases: [/\bpillowfort\b/i, /\bpillow[\s-]?fort\b/i],
    expand: 'propaganda ghostly prison opponents cannot attack unless pays',
    archetypes: ['stax'],
    cardOracle: [
      /can't attack you unless/i,
      /can't attack unless/i,
      /unless .* pays .* \{/i,
      /creatures can't attack you/i,
      /skip .* combat phase/i,
      /don't untap during their controller's untap step/i,
    ],
  },
  {
    id: 'blue-farm',
    label: 'Blue Farm — Tymna / Kraum',
    aliases: [/\bblue farm\b/i, /\btymna[\s/]+kraum\b/i, /\bkraum[\s/]+tymna\b/i],
    expand: 'tymna kraum partner spells value draw',
    commanders: ['Tymna the Weaver', "Kraum, Ludevic's Opus"],
    partnerPairs: [['Tymna the Weaver', "Kraum, Ludevic's Opus"]],
  },
  {
    id: 'cedh',
    label: 'cEDH — competitive (Bracket 5)',
    aliases: [/\bcedh\b/i, /\bcompetitive edh\b/i, /\bcompetitive commander\b/i],
    expand: 'fast mana tutors combo competitive high power',
    bracket: 5,
    archetypes: ['combo', 'control'],
  },
  {
    id: 'high-power',
    label: 'High power (Bracket 4–5)',
    aliases: [/\bhigh power\b/i, /\bhigh-power\b/i, /\boptimized\b/i],
    bracket: 4,
  },
  {
    id: 'mid',
    label: 'Mid power (Bracket 3)',
    aliases: [/\bmid power\b/i, /\bmid-power\b/i, /\bmidpower\b/i],
    bracket: 3,
  },
  {
    id: 'jank',
    label: 'Casual / jank (Bracket 1–2)',
    aliases: [/\bjank\b/i, /\bcasual\b/i, /\bprecon\b/i],
    bracket: 2,
  },
  {
    id: 'turbo',
    label: 'Turbo — fast mana & wins',
    aliases: [/\bturbo\b/i, /\bfast mana\b/i],
    expand: 'mana rock ritual tutor fast combo win',
    archetypes: ['combo', 'treasure'],
  },
  {
    id: 'farm',
    label: 'Farm — value engine',
    aliases: [/\bfarm deck\b/i, /\bvalue farm\b/i],
    expand: 'draw spells value engine',
    archetypes: ['spellslinger', 'control'],
  },
  {
    id: 'aristocrats',
    label: 'Aristocrats',
    aliases: [/\baristocrats?\b/i, /\bsacrifice deck\b/i],
    expand: 'sacrifice dies when creature dies',
    jargonId: 'sacrifice',
    archetypes: ['aristocrats'],
  },
  {
    id: 'stax',
    label: 'Stax / resource denial',
    aliases: [/\bstax\b/i, /\btax(?:es)?\b/i, /\bresource denial\b/i, /\bprison\b/i],
    expand: 'tax opponents cannot cast pays more',
    jargonId: 'tax',
    archetypes: ['stax'],
  },
  {
    id: 'group-hug',
    label: 'Group hug',
    aliases: [/\bgroup hug\b/i, /\bgroup-hug\b/i],
    expand: 'each player draws gains life',
    archetypes: ['group-hug'],
  },
  {
    id: 'storm',
    label: 'Storm — cast many spells in one turn',
    aliases: [/\bstorm\b/i, /\bstorm count\b/i],
    expand: 'storm whenever you cast instant sorcery copy',
    archetypes: ['spellslinger', 'combo'],
    cardOracle: [/\bstorm\b/i, /copy (?:it|this spell|that spell)/i],
  },
  {
    id: 'wheel',
    label: 'Wheel — forced draws & punishers',
    aliases: [/\bwheels?\b/i, /\bwheel effect\b/i, /\bdraw punish(?:er|ers)?\b/i],
    expand: 'opponent draws discard hand draw seven additional card',
    archetypes: ['wheel'],
    commanderOracle: WHEEL_ORACLE,
    commanders: [
      'Nekusar, the Mindrazer',
      'Xyris, the Writhing Storm',
      'Sheoldred, the Apocalypse',
      'Heliod, the Radiant Dawn // Heliod, the Warped Eclipse',
      'Kami of the Crescent Moon',
      'Zurzoth, Chaos Rider',
      'The Council of Four',
    ],
    cardOracle: [
      /each player (?:may )?discard (?:their )?hand/i,
      /each player discards? .{0,80}draws?/is,
      /each player draws? (?:seven|cards)/i,
      /wheel of fortune/i,
    ],
  },
  {
    id: 'consult',
    label: 'Consultation combo',
    aliases: [/\bconsult\b/i, /\bthoracle\b/i, /\bcedh consult\b/i],
    expand: 'laboratory manic scientist demonic consultation',
    commanders: ['Tymna the Weaver', 'Thrasios, Triton Hero', 'Kraum, Ludevic\'s Opus'],
  },
  {
    id: 'niv',
    label: 'Niv-Mizzet Reborn',
    aliases: [/\bniv to light\b/i, /\bniv-mizzet reborn\b/i],
    commanders: ['Niv-Mizzet Reborn'],
  },
  {
    id: 'slivers',
    label: 'Slivers',
    aliases: [/\bslivers?\b/i, /\bsliver queen\b/i],
    expand: 'sliver lord',
    commanders: [
      'The First Sliver',
      'Sliver Overlord',
      'Sliver Queen',
      'Sliver Legion',
      'Sliver Hivelord',
      'Sliver Gravemother',
    ],
    archetypes: ['tribal'],
  },
  {
    id: 'rats',
    label: 'Rats',
    aliases: [/\brats?\b/i, /\brat tribal\b/i, /\brat colony\b/i],
    expand: 'rat lord swarm',
    commanders: [
      'Vren, the Relentless',
      'Lord Skitter, Sewer King',
      'Marrow-Gnawer',
      'Karumonix, the Rat King',
      'Ashcoat of the Shadow Swarm',
    ],
    archetypes: ['tribal'],
  },
  {
    id: 'enchantress',
    label: 'Enchantress — enchantments matter',
    aliases: [
      /\benchantress\b/i,
      /\benchantrix\b/i,
      /\benchantment\s+(?:matters|tribal|deck|commander)\b/i,
    ],
    expand: 'enchantment constellation shrine draw cast enchantment',
    archetypes: ['enchantments'],
    commanderOracle: [
      /whenever you cast an enchantment/i,
      /whenever an enchantment enters/i,
      /enchantments? you control/i,
      /constellation/i,
      /noncreature enchantment/i,
    ],
    commanders: [
      'Sythis, Harvest\'s Hand',
      'Hamma, Host of Hosts',
      'Sigarda, Font of Blessings',
      'Tuvasa the Sunlit',
      'Anikthea, Hand of Erebos',
      'Estrid, the Masked',
    ],
  },
  {
    id: 'theft',
    label: 'Theft — steal & cast opponents\' cards',
    aliases: [
      /\btheft\b/i,
      /\bsteal(?:s|ing)?\b/i,
      /\bthief\b/i,
      /\bthieves\b/i,
      /\brob(?:s|bery)?\b/i,
    ],
    expand: 'cast opponent cards exile steal hand library',
    archetypes: ['theft'],
    commanderOracle: THEFT_ORACLE,
    commanders: [
      'Gonti, Lord of Luxury',
      'Gonti, Canny Acquisitor',
      'Gonti, Night Minister',
      'Tergrid, God of Fright // Tergrid\'s Lantern',
      'Jeleva, Nephalia\'s Scourge',
      'Sen Triplets',
      'Laelia, the Blade Reforged',
      'Hazezon, Shaper of Sand',
      'Etali, Primal Storm',
      'Etali, Primal Conqueror // Etali, Primal Sickness',
      'Kotis, the Fangkeeper',
    ],
  },
  {
    id: 'reanimator',
    label: 'Reanimator — graveyard to battlefield',
    aliases: [/\breanimator?\b/i, /\breanimate\b/i, /\braise dead\b/i, /\brecur(?:sion|sion)?\b/i],
    expand: 'graveyard return battlefield reanimate',
    archetypes: ['graveyard'],
    commanderOracle: REANIMATOR_ORACLE,
    commanders: [
      'Chainer, Dementia Master',
      'Meren of Clan Nel Toth',
      'Karador, Ghost Chieftain',
      'Muldrotha, the Gravetide',
      'Sharuum the Hegemon',
      'Kotis, Sibsig Champion',
    ],
  },
  {
    id: 'voltron',
    label: 'Voltron — suit up commander',
    aliases: [/\bvoltron\b/i, /\bequipment (?:matters|deck)\b/i, /\bauras? (?:matters|deck)\b/i],
    expand: 'equipment aura equipped commander combat',
    archetypes: ['voltron'],
    commanderOracle: [/equipped creature/i, /enchant(ed)? creature/i, /equipment/i],
    commanders: [
      'Rafiq of the Many',
      'Uril, the Mistwalker',
      'Sigarda, Host of Herons',
      'Light-Paws, Emperor\'s Voice',
    ],
  },
  {
    id: 'tokens',
    label: 'Tokens — go wide',
    aliases: [/\btokens?\b/i, /\bgo[\s-]?wide\b/i, /\bwide board\b/i, /\banthem\b/i],
    expand: 'create token populate wide army',
    archetypes: ['tokens'],
    commanderOracle: [/create .* token/i, /token creatures? you control/i, /populate/i],
    commanders: [
      'Krenko, Mob Boss',
      'Edgar Markov',
      'Rhys the Redeemed',
      'Jetmir, Nexus of Revels',
    ],
  },
  {
    id: 'lands',
    label: 'Lands matter',
    aliases: [/\blands?\s+matter\b/i, /\blandfall\b/i, /\bterrain\b/i],
    expand: 'landfall play land search land',
    archetypes: ['lands'],
    commanderOracle: [/landfall/i, /play .* (?:additional )?land/i, /lands? you control/i],
    commanders: [
      'Omnath, Locus of Rage',
      'Azusa, Lost but Seeking',
      'Tatyova, Benthic Druid',
      'Lord Windgrace',
    ],
  },
  {
    id: 'superfriends',
    label: 'Superfriends — planeswalkers',
    aliases: [/\bsuperfriends\b/i, /\bplaneswalkers?\b/i, /\bwalkers?\b/i, /\bpw\b/i],
    expand: 'planeswalker loyalty proliferate',
    archetypes: ['superfriends'],
    commanderOracle: [
      /when(?:ever)? .* planeswalker enters/i,
      /planeswalker spells? cost/i,
      /loyalty counter/i,
      /(?:add|remove) .* loyalty/i,
      /proliferate/i,
    ],
    commanders: [
      'Atraxa, Praetors\' Voice',
      'Teferi, Temporal Archmage',
      'Narset, Enlightened Exile',
    ],
  },
  {
    id: 'spellslinger',
    label: 'Spellslinger — instants & sorceries',
    aliases: [/\bspellslinger\b/i, /\binstants?\s+(?:and|&)\s+sorceries?\b/i, /\bcast (?:a )?lot\b/i],
    expand: 'instant sorcery whenever you cast magecraft storm',
    archetypes: ['spellslinger'],
    commanderOracle: [/instant or sorcery/i, /whenever you cast/i, /magecraft/i, /storm/i],
    commanders: [
      'Kess, Dissident Mage',
      'Mizzix of the Izmagnus',
      'Veyran, Voice of Duality',
      'Gadwick, the Wizened',
    ],
  },
  {
    id: 'counters',
    label: '+1/+1 counters',
    aliases: [/\b\+?1\/\+?1 counters?\b/i, /\bproliferate\b/i, /\bcounter(?:s|y)\b/i],
    expand: 'proliferate +1/+1 counter grow',
    archetypes: ['counters'],
    commanderOracle: [/\+1\/\+1 counter/i, /proliferate/i],
    commanders: [
      'Atraxa, Praetors\' Voice',
      'Animar, Soul of Elements',
      'Zaxxis, the Walker',
      'Grumgully, the Generous',
    ],
  },
  {
    id: 'mill',
    label: 'Mill — empty libraries',
    aliases: [/\bmill(?:ing)?\b/i, /\blibrary destruction\b/i],
    expand: 'mill put cards graveyard library',
    archetypes: ['mill'],
    commanderOracle: [/mill/i, /put .* cards? .* into (?:their )?graveyard/i],
    commanders: [
      'Phenax, God of Deception',
      'Bruvac the Grandiloquent',
      'Mirko Vosk, Mind Drinker',
    ],
  },
  {
    id: 'burn',
    label: 'Burn — direct damage',
    aliases: [/\bburn\b/i, /\bbolt\b/i, /\bdirect damage\b/i, /\bping\b/i],
    expand: 'damage any target burn',
    archetypes: ['burn'],
    commanderOracle: [/(?:deals?|any target).* damage/i, /damage to (?:any )?target/i],
    commanders: [
      'Torbran, Thane of Red Fell',
      'Kazuul, Tyrant of the Cliffs',
      'Purphoros, God of the Forge',
    ],
  },
  {
    id: 'blink',
    label: 'Blink / ETB',
    aliases: [/\bblink\b/i, /\bflicker\b/i, /\betb\b/i, /\benter(?:s)? the battlefield\b/i],
    expand: 'exile return flicker enters battlefield blink',
    archetypes: ['blink'],
    commanderOracle: [
      /exile .* return .* to the battlefield/i,
      /exile .* then return/i,
      /flicker/i,
    ],
    commanders: [
      'Yarok, the Desecrated',
      'Brago, King Eternal',
      'Roon of the Hidden Realm',
    ],
  },
  {
    id: 'artifacts',
    label: 'Artifacts matter',
    aliases: [/\bartifacts?\s+(?:matters|tribal|deck)\b/i, /\baffinity\b/i, /\bclue\b/i, /\bfood\b/i],
    expand: 'artifact affinity treasure',
    archetypes: ['artifacts'],
    commanderOracle: [/artifact/i, /affinity for artifacts/i, /treasure token/i],
    commanders: [
      'Urza, Lord High Artificer',
      'Osgir, the Reconstructor',
      'Depala, Pilot Exemplar',
    ],
  },
  {
    id: 'lifegain',
    label: 'Lifegain',
    aliases: [/\blifegain\b/i, /\blife gain\b/i, /\bextort\b/i, /\bsoul sisters\b/i],
    expand: 'gain life extort drain',
    archetypes: ['lifegain'],
    commanderOracle: [/gain .* life/i, /you gain life/i, /extort/i],
    commanders: [
      'Heliod, Sun-Crowned',
      'Lathiel, the Bounteous Dawn',
      'Karlov of the Ghost Council',
    ],
  },
  {
    id: 'infect',
    label: 'Infect — poison counters',
    aliases: [/\binfect(?:ion)?\b/i, /\bpoison\b/i, /\bproliferate poison\b/i],
    expand: 'infect poison counter proliferate',
    archetypes: ['counters', 'combat'],
    commanderOracle: [/infect/i, /poison counter/i],
    commanders: [
      'Skithiryx, the Dragon',
      'Atraxa, Praetors\' Voice',
      'Glissa, the Traitor',
    ],
  },
  {
    id: 'discard',
    label: 'Discard / madness',
    aliases: [/\bdiscard\b/i, /\bmadness\b/i, /\bdiscard (?:matters|deck)\b/i],
    expand: 'discard madness self-mill',
    archetypes: ['control'],
    commanderOracle: [/discard/i, /madness/i, /whenever .* discards/i],
    commanders: [
      'The Locust God',
      'Nekusar, the Mindrazer',
      'Xyvarith, the Doom Card',
    ],
  },
  {
    id: 'tutor',
    label: 'Tutor toolbox',
    aliases: [/\btutor(?:s|ing)?\b/i, /\btoolbox\b/i, /\bfind (?:a )?card\b/i],
    expand: 'search library tutor',
    archetypes: ['combo', 'control'],
    commanderOracle: [/search your library for/i],
  },
  {
    id: 'politics',
    label: 'Politics — table deals',
    aliases: [/\bpolitics\b/i, /\bpolitical\b/i, /\bkingmaker\b/i, /\bthreat assessment\b/i],
    expand: 'each player choose vote politics',
    archetypes: ['group-hug', 'control'],
    commanderOracle: [/each player (?:chooses|may|votes)/i, /vote/i],
    commanders: [
      'Kynaios and Tiro of Meletis',
      'Zedruu the Greathearted',
      'Jared Carthalion, True Heir',
    ],
  },
  {
    id: 'dragons',
    label: 'Dragons tribal',
    aliases: [/\bdragons?\b/i, /\bdragon tribal\b/i],
    expand: 'dragon lord',
    archetypes: ['tribal'],
    commanderOracle: [/dragon/i],
    commanders: [
      'The Ur-Dragon',
      'Miirym, Sentinel Wyrm',
      'Lathliss, Dragon Queen',
    ],
  },
  {
    id: 'elves',
    label: 'Elves tribal',
    aliases: [/\belves?\b/i, /\belf tribal\b/i],
    expand: 'elf lord mana dork',
    archetypes: ['tribal'],
    commanderOracle: [/(?:elf|elves) you control/i],
    commanders: [
      'Lathril, Blade of the Elves',
      'Ezuri, Renegade Leader',
      'Marwyn, the Nurturer',
    ],
  },
  {
    id: 'zombies',
    label: 'Zombies tribal',
    aliases: [/\bzombies?\b/i, /\bzombie tribal\b/i, /\bundead\b/i],
    expand: 'zombie lord amass',
    archetypes: ['tribal'],
    commanderOracle: [/zombie/i, /amass/i],
    commanders: [
      'Wilhelt, the Rotcleaver',
      'Gisa and Geralf',
      'Grimgrin, Corpse-Born',
    ],
  },
  {
    id: 'goblins',
    label: 'Goblins tribal',
    aliases: [/\bgoblins?\b/i, /\bgoblin tribal\b/i],
    expand: 'goblin lord haste',
    archetypes: ['tribal'],
    commanderOracle: [/goblin/i],
    commanders: [
      'Krenko, Mob Boss',
      'Krenko, Tin Street Kingpin',
      'Muxus, Goblin Grandee',
    ],
  },
  {
    id: 'allies',
    label: 'Allies tribal',
    aliases: [/\ballies?\b/i, /\bally tribal\b/i],
    expand: 'ally enters the battlefield',
    archetypes: ['tribal'],
    commanderOracle: [/ally you control/i, /another ally/i, /ally creature token/i],
    commanders: [
      'Katara, the Fearless',
      'Sokka, Tenacious Tactician',
      'General Tazri',
      'Zada, Hedron Grinder',
    ],
  },
]

export function detectSlang(text: string): DetectedSlang[] {
  const found: DetectedSlang[] = []
  const seen = new Set<string>()

  for (const entry of SLANG) {
    if (seen.has(entry.id)) continue
    if (entry.aliases.some((re) => re.test(text))) {
      found.push({ entry })
      seen.add(entry.id)
    }
  }

  return found
}

export function expandSlangInPrompt(prompt: string): string {
  const text = prompt.trim().toLowerCase()
  const detected = detectSlang(text)
  if (detected.length === 0) return prompt

  const extras = detected
    .map((d) => d.entry.expand)
    .filter(Boolean) as string[]

  return extras.length > 0 ? `${prompt} ${extras.join(' ')}` : prompt
}

export function describeSlangInPrompt(prompt: string): string {
  const detected = detectSlang(prompt)
  if (detected.length === 0) return ''

  const parts = detected.map((d) => d.entry.label)
  const bracket = getSlangBracket(prompt)
  if (bracket && !parts.some((p) => p.includes('Bracket'))) {
    parts.push(`Bracket ${bracket}`)
  }
  return parts.join(' · ')
}

export function getSlangCommanderNames(prompt: string): string[] {
  const names = new Set<string>()
  for (const { entry } of detectSlang(prompt)) {
    for (const n of entry.commanders ?? []) names.add(n)
  }
  return [...names]
}

export function getSlangPartnerPairs(prompt: string): [string, string][] {
  const pairs: [string, string][] = []
  for (const { entry } of detectSlang(prompt)) {
    for (const p of entry.partnerPairs ?? []) pairs.push(p)
  }
  return pairs
}

export function getSlangArchetypeIds(prompt: string): string[] {
  const ids = new Set<string>()
  for (const { entry } of detectSlang(prompt)) {
    for (const id of entry.archetypes ?? []) ids.add(id)
  }
  return [...ids]
}

export function getSlangBracket(prompt: string): Bracket | undefined {
  let bracket: Bracket | undefined
  for (const { entry } of detectSlang(prompt)) {
    if (entry.bracket != null) bracket = entry.bracket
  }
  return bracket
}

export function getSlangJargonIds(prompt: string): string[] {
  const ids = new Set<string>()
  for (const { entry } of detectSlang(prompt)) {
    if (entry.jargonId) ids.add(entry.jargonId)
  }
  return [...ids]
}

export function scoreCardForSlang(
  card: CardRecord,
  prompt: string,
): { score: number; reason: string } | null {
  const detected = detectSlang(prompt)
  if (detected.length === 0) return null

  let best: { score: number; reason: string } | null = null
  const oracle = card.oracle_text
  const hay = `${card.name} ${card.type_line} ${oracle}`.toLowerCase()

  for (const { entry } of detected) {
    if (!entry.cardOracle?.length) continue

    for (const re of entry.cardOracle) {
      if (re.test(oracle) || re.test(hay)) {
        const score = entry.id === 'pillowfort' ? 90 : entry.id === 'etb' ? 88 : 85
        if (!best || score > best.score) {
          best = { score, reason: entry.label.split(' — ')[0] ?? entry.label }
        }
        break
      }
    }
  }

  return best
}

export function scoreCommanderSlang(
  commander: { name: string; oracle_text: string; type_line: string; tags: string[] },
  prompt: string,
): { matchedIds: string[]; reasons: string[] } {
  const matchedIds: string[] = []
  const reasons: string[] = []
  const hay = `${commander.name} ${commander.type_line} ${commander.oracle_text}`

  for (const { entry } of detectSlang(prompt)) {
    const nameHit = entry.commanders?.some((n) => n.toLowerCase() === commander.name.toLowerCase())
    const oracleHit = entry.commanderOracle?.some((re) => re.test(hay))

    if (nameHit) {
      matchedIds.push(entry.id)
      reasons.push(entry.label.split(' — ')[0] ?? entry.label)
      continue
    }

    if (oracleHit) {
      matchedIds.push(entry.id)
      reasons.push(`${entry.label.split(' — ')[0] ?? entry.label} in text`)
    }
  }

  return { matchedIds, reasons }
}

export function commanderMatchesSlangName(
  commanderName: string,
  prompt: string,
): { boost: number; reason: string } | null {
  const lower = commanderName.toLowerCase()
  for (const { entry } of detectSlang(prompt)) {
    for (const name of entry.commanders ?? []) {
      if (name.toLowerCase() === lower) {
        return { boost: 40, reason: entry.label }
      }
    }
  }
  return null
}

export function pairMatchesSlang(
  primaryName: string,
  partnerName: string,
  prompt: string,
): { boost: number; reason: string } | null {
  const pLower = primaryName.toLowerCase()
  const qLower = partnerName.toLowerCase()

  for (const { entry } of detectSlang(prompt)) {
    for (const [a, b] of entry.partnerPairs ?? []) {
      const aL = a.toLowerCase()
      const bL = b.toLowerCase()
      if (
        (pLower === aL && qLower === bL) ||
        (pLower === bL && qLower === aL)
      ) {
        return { boost: 120, reason: entry.label }
      }
    }
  }
  return null
}
