/** Levenshtein distance for typo-tolerant prompt matching */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }

  return dp[b.length]
}

import { COMMON_TRIBES } from './commander-tribes'

/** Words we recognize — MTG terms, jargon, and common prompt vocabulary */
export const PROMPT_DICTIONARY = [
  'whenever', 'when', 'creature', 'creatures', 'enters', 'enter', 'entered',
  'battlefield', 'draw', 'card', 'cards', 'destroy', 'exile', 'target',
  'counter', 'spell', 'spells', 'instant', 'sorcery', 'enchantment',
  'artifact', 'planeswalker', 'land', 'lands', 'library', 'search',
  'graveyard', 'sacrifice', 'dies', 'death', 'token', 'tokens', 'damage',
  'life', 'gain', 'lose', 'tutor', 'tutors', 'tutoring', 'ramp', 'removal',
  'wipe', 'board', 'mass', 'reanimate', 'reanimator', 'mill', 'blink', 'wheel', 'wheels',
  'flicker', 'aristocrats', 'stax', 'tax', 'taxes', 'voltron', 'equipment',
  'tribal', 'elf', 'elves', 'goblin', 'zombie', 'dragon', 'landfall',
  'proliferate', 'treasure', 'hexproof', 'indestructible', 'protection',
  'burn', 'bolt', 'combo', 'infinite', 'attack', 'attacks', 'combat',
  'cast', 'casting', 'trigger', 'triggered', 'ability', 'abilities',
  'opponent', 'opponents', 'player', 'control', 'commander', 'legendary',
  'artifact', 'enchantment', 'permanent', 'return',
  'hand', 'field', 'stack', 'priority', 'response', 'respond', 'copy',
  'clone', 'legend', 'rule', 'dies', 'lethal', 'indestructible', 'etb',
  'dies', 'dies', 'discards', 'discard', 'investigate', 'connive',
  'spellslinger', 'aristocrat', 'politics', 'group', 'hug', 'counters',
  'counterspell', 'permission', 'recursion', 'gy', 'hate', 'wide',
  // Evergreen & common keyword abilities (must not typo-correct haste → hate)
  'haste', 'vigilance', 'flying', 'flyer', 'flyers', 'trample', 'deathtouch',
  'lifelink', 'hexproof', 'indestructible', 'indestructable', 'ward', 'menace',
  'reach', 'defender', 'flash', 'shroud', 'cascade', 'prowess', 'scry',
  'surveil', 'explore', 'convoke', 'extort', 'mentor', 'riot', 'infect',
  'flashback', 'madness', 'kicker', 'multikicker', 'myriad', 'encore',
  'ninjutsu', 'constellation', 'enrage', 'undying', 'persist', 'escape',
  'disturb', 'embalm', 'mutate', 'blitz', 'dash', 'morph', 'manifest',
  'battalion', 'exalted', 'dethrone', 'monarch', 'cycling', 'suspend',
  'overload', 'foretell', 'spectacle', 'populate', 'evolve', 'adapt',
  'toxic', 'annihilator', 'magecraft', 'storm', 'plot', 'craft',
  ...COMMON_TRIBES,
]

/** Exact keyword terms — skip typo correction and archetype fuzzy matching */
export const KEYWORD_TERMS = new Set([
  'haste', 'vigilance', 'flying', 'flyer', 'flyers', 'trample', 'deathtouch',
  'lifelink', 'hexproof', 'indestructible', 'indestructable', 'ward', 'menace',
  'reach', 'defender', 'flash', 'shroud', 'cascade', 'prowess', 'scry',
  'surveil', 'explore', 'convoke', 'extort', 'mentor', 'riot', 'infect',
  'flashback', 'madness', 'kicker', 'multikicker', 'myriad', 'encore',
  'ninjutsu', 'constellation', 'enrage', 'undying', 'persist', 'escape',
  'disturb', 'embalm', 'mutate', 'blitz', 'dash', 'morph', 'manifest',
  'battalion', 'exalted', 'dethrone', 'monarch', 'cycling', 'suspend',
  'overload', 'foretell', 'spectacle', 'populate', 'evolve', 'adapt',
  'toxic', 'annihilator', 'magecraft', 'storm', 'plot', 'craft', 'strike',
])

function maxTypoDistance(word: string): number {
  if (word.length <= 3) return 0
  if (word.length <= 5) return 1
  return 2
}

/** Common short words — never typo-correct (e.g. "from" → "frog"). */
const TYPO_CORRECT_SKIP = new Set([
  'from', 'with', 'that', 'this', 'your', 'have', 'when', 'each', 'into',
  'onto', 'upon', 'also', 'only', 'over', 'than', 'then', 'them', 'they',
  'what', 'just', 'like', 'make', 'more', 'some', 'such', 'very', 'well',
  'back', 'been', 'being', 'both', 'does', 'done', 'down', 'even', 'ever',
  'here', 'how', 'its', 'know', 'most', 'much', 'must', 'near', 'need',
  'never', 'next', 'once', 'same', 'seem', 'side', 'take', 'tell', 'turn',
  'used', 'want', 'where', 'which', 'while', 'whom', 'whose', 'would',
  'could', 'should', 'about', 'after', 'before', 'without', 'between',
  'other', 'their', 'there', 'these', 'those', 'under', 'until', 'while',
])

/** Replace mistyped words with closest dictionary match */
export function fixPromptTypos(text: string): { fixed: string; corrections: string[] } {
  const corrections: string[] = []
  const dict = PROMPT_DICTIONARY

  const fixed = text
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim() || part.trim().length < 4) return part
      const word = part.toLowerCase().replace(/[^a-z0-9+-]/g, '')
      if (word.length < 4) return part
      if (KEYWORD_TERMS.has(word) || TYPO_CORRECT_SKIP.has(word)) return part

      let best = word
      let bestDist = maxTypoDistance(word) + 1

      for (const term of dict) {
        const d = levenshtein(word, term)
        if (d <= maxTypoDistance(word) && d < bestDist) {
          bestDist = d
          best = term
        }
      }

      if (best !== word) {
        corrections.push(`${word} → ${best}`)
        return part.replace(new RegExp(word, 'i'), best)
      }
      return part
    })
    .join('')

  return { fixed, corrections }
}

export function normalizeWithTypos(text: string): {
  text: string
  corrections: string[]
} {
  const lower = text.toLowerCase().replace(/[^\w\s+'/-]/g, ' ').replace(/\s+/g, ' ').trim()
  const { fixed, corrections } = fixPromptTypos(lower)
  return { text: fixed, corrections }
}
