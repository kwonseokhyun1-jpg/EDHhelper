/** Creature types and tribal matching for commander search */

const PLURAL_TO_SINGULAR: Record<string, string> = {
  elves: 'elf',
  wolves: 'wolf',
  rats: 'rat',
  slivers: 'sliver',
  goblins: 'goblin',
  zombies: 'zombie',
  dragons: 'dragon',
  vampires: 'vampire',
  soldiers: 'soldier',
  wizards: 'wizard',
  humans: 'human',
  demons: 'demon',
  angels: 'angel',
  knights: 'knight',
  warriors: 'warrior',
  spirits: 'spirit',
  elementals: 'elemental',
  shamans: 'shaman',
  dinosaurs: 'dinosaur',
  hydras: 'hydra',
  ninjas: 'ninja',
  samurai: 'samurai',
  pirates: 'pirate',
  horrors: 'horror',
  beasts: 'beast',
  snakes: 'snake',
  spiders: 'spider',
  insects: 'insect',
  plants: 'plant',
  giants: 'giant',
  clerics: 'cleric',
  rogues: 'rogue',
  druids: 'druid',
  artificers: 'artificer',
  cats: 'cat',
  birds: 'bird',
  dwarves: 'dwarf',
  allies: 'ally',
}

export function singularizeTribe(word: string): string {
  const lower = word.toLowerCase()
  return PLURAL_TO_SINGULAR[lower] ?? lower.replace(/s$/, '')
}

/** Parse subtype tokens from a Scryfall type line (after the em dash). */
export function parseCreatureTypes(typeLine: string): string[] {
  const parts = typeLine.split(/\s*[—–-]\s*/)
  if (parts.length < 2) return []
  return parts[parts.length - 1]
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean)
}

export function hasCreatureType(types: string[], tribe: string): boolean {
  const target = singularizeTribe(tribe)
  return types.some((raw) => singularizeTribe(raw) === target)
}

/** Strong tribal synergy: lords, anthems, or payoffs for a creature type. */
export function isTribeLord(oracleText: string, typeLine: string, tribe: string): boolean {
  const t = singularizeTribe(tribe)
  const patterns = [
    new RegExp(`other ${t}s? you control get`, 'i'),
    new RegExp(`${t}s? you control get`, 'i'),
    new RegExp(`${t}s? you control have`, 'i'),
    new RegExp(`whenever (a|another) ${t}`, 'i'),
    new RegExp(`whenever you cast a ${t}`, 'i'),
    new RegExp(`for each ${t} you control`, 'i'),
    new RegExp(`number of ${t}s? you control`, 'i'),
    new RegExp(`create .* ${t} token`, 'i'),
    new RegExp(`another ${t} you control enters`, 'i'),
    new RegExp(`${t} you control`, 'i'),
  ]
  const text = `${oracleText} ${typeLine}`
  return patterns.some((re) => re.test(text))
}

/** Word-boundary check — avoids matching "rat" inside "Liberator". */
export function containsWholeWord(text: string, word: string): boolean {
  if (word.length < 2) return false
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i')
  return re.test(text)
}

export const COMMON_TRIBES = [
  'elf', 'elves', 'goblin', 'zombie', 'dragon', 'merfolk', 'vampire', 'soldier',
  'cat', 'bird', 'sliver', 'wizard', 'human', 'demon', 'angel', 'treefolk',
  'dwarf', 'knight', 'warrior', 'rat', 'spirit', 'elemental', 'shaman',
  'dinosaur', 'hydra', 'phoenix', 'ninja', 'samurai', 'pirate', 'horror',
  'beast', 'wolf', 'snake', 'spider', 'insect', 'plant', 'myr', 'giant',
  'gorgon', 'minotaur', 'troll', 'cleric', 'rogue', 'druid', 'artificer',
  'mutant', 'noble', 'faerie', 'naga', 'octopus', 'crab', 'fish', 'frog',
  'squirrel', 'rabbit', 'dog', 'bat', 'bear', 'devil', 'imp', 'god',
  'scout', 'archer', 'monk', 'peasant', 'citizen', 'advisor', 'construct',
  'ally', 'allies', 'avatar', 'lesson', 'student', 'detective', 'survivor', 'egg',
]

export function detectTribesInText(text: string): string[] {
  const found = new Set<string>()
  for (const tribe of COMMON_TRIBES) {
    const re = new RegExp(`\\b${tribe}s?\\b`, 'i')
    if (re.test(text)) found.add(singularizeTribe(tribe))
  }
  return [...found]
}
