import type { CardRecord } from '../types/card'
import type { ColorFilter } from '../types/mtg'
import {
  containsWholeWord,
  detectTribesInText,
  hasCreatureType,
  isTribeLord,
  parseCreatureTypes,
  singularizeTribe,
} from './commander-tribes'
import { fitsColorIdentity } from './color-filter'
import {
  detectJargon,
  extractTutorTarget,
  normalizePrompt,
} from './mtg-jargon'
import { detectKeywordsInText, scoreCardKeywords } from './mtg-keywords'
import { describeSlangInPrompt, expandSlangInPrompt, scoreCardForSlang } from './mtg-slang'
import { normalizeWithTypos } from './fuzzy-text'

export type CardPromptMatch = {
  card: CardRecord
  score: number
  matchPercent: number
  reasons: string[]
}

/** Minimum absolute match % to appear in results */
export const MIN_STRONG_MATCH_SCORE = 55

const PROMPT_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'deck', 'card', 'cards', 'that', 'this',
  'want', 'need', 'like', 'play', 'style', 'based', 'around', 'should', 'does', 'when',
])

function promptTerms(prompt: string): string[] {
  const { text } = normalizeWithTypos(prompt)
  return text
    .replace(/[^a-z0-9+\-/\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !PROMPT_STOP.has(w))
}

function scoreCardByTerms(card: CardRecord, prompt: string): ScoredAbility | null {
  const expanded = normalizePrompt(expandSlangInPrompt(prompt))
  const terms = promptTerms(expanded)
  const tribes = detectTribesInText(expanded)
  const phrase = expanded.toLowerCase().trim()

  if (terms.length === 0 && tribes.length === 0 && phrase.length < 2) return null

  const name = card.name.toLowerCase()
  const typeLine = card.type_line.toLowerCase()
  const oracle = card.oracle_text.toLowerCase()
  const creatureTypes = parseCreatureTypes(card.type_line)
  let score = 0
  const reasons: string[] = []

  for (const tribe of tribes) {
    const label = tribe.charAt(0).toUpperCase() + tribe.slice(1)
    if (hasCreatureType(creatureTypes, tribe)) {
      score = Math.max(score, 92)
      reasons.push(`${label} creature`)
    } else if (isTribeLord(card.oracle_text, card.type_line, tribe)) {
      score = Math.max(score, 88)
      reasons.push(`${label} tribal payoff`)
    } else if (containsWholeWord(oracle, tribe) || containsWholeWord(typeLine, tribe)) {
      score = Math.max(score, 72)
      reasons.push(`Mentions ${label.toLowerCase()}`)
    } else if (containsWholeWord(name, tribe)) {
      score = Math.max(score, 76)
      reasons.push(`Name relates to ${label.toLowerCase()}`)
    }
  }

  if (phrase.length >= 3) {
    if (name.includes(phrase)) {
      score = Math.max(score, 85)
      reasons.push('Name matches your search')
    } else if (typeLine.includes(phrase)) {
      score = Math.max(score, 82)
      reasons.push('Type line matches your search')
    } else if (oracle.includes(phrase)) {
      score = Math.max(score, 78)
      reasons.push('Oracle text matches your search')
    }
  }

  for (const word of terms) {
    const tribe = singularizeTribe(word)
    if (tribes.includes(tribe)) continue

    if (name.includes(word)) {
      score = Math.max(score, 74)
      if (!reasons.some((r) => r.startsWith('Name'))) reasons.push(`Name contains "${word}"`)
    }
    if (typeLine.includes(word)) {
      const isSubtype = hasCreatureType(creatureTypes, word)
      score = Math.max(score, isSubtype ? 90 : 68)
      reasons.push(isSubtype ? `${word} creature type` : `Type contains "${word}"`)
    }
    if (oracle.includes(word) || containsWholeWord(oracle, word)) {
      score = Math.max(score, 58)
      if (reasons.length < 3) reasons.push(`Oracle mentions "${word}"`)
    }
  }

  if (score === 0) return null
  return { score: clamp(score, 0, 100), reason: reasons[0] ?? 'Text match' }
}

type ScoredAbility = {
  score: number
  reason: string
}

function splitAbilities(oracle: string): string[] {
  return oracle
    .replace(/\u2014/g, ',')
    .split(/\n|\/\//)
    .flatMap((line) => line.split(/(?<=\.)\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 4)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function scoreCreatureEnterDraw(abilities: string[]): ScoredAbility | null {
  let best: ScoredAbility | null = null

  for (const ability of abilities) {
    if (/when(?:ever)? (?:an |a )?opponent draws/i.test(ability)) continue
    if (/when this creature enters/i.test(ability) && /opponent draws/i.test(ability)) continue

    const hasCreatureEnter =
      /when(?:ever)? /i.test(ability) && /creature/i.test(ability) && /enter/i.test(ability)
    if (!hasCreatureEnter) continue

    const hasYouDraw =
      /(?:,\s*|\.\s*)(?:you )?(?:may )?draw (?:a |one |two |three |\d )?cards?/i.test(ability) ||
      /enter(?:s)?(?: the battlefield)?(?: under your control)?, (?:you )?(?:may )?draw/i.test(ability)

    if (!hasYouDraw) continue

    if (/when(?:ever)? (?:a |an |each )?creature(?:s)? (?:enter|enters) the battlefield, (?:you )?(?:may )?draw/i.test(ability)) {
      best = { score: 98, reason: 'Whenever a creature enters, you draw — exact match' }
      break
    }

    if (/when(?:ever)? one or more (?:other )?creatures?.* enter.*draw/i.test(ability)) {
      const s = 88
      if (!best || s > best.score) {
        best = { score: s, reason: 'Draw when creatures enter (with conditions)' }
      }
      continue
    }

    if (/when (?:this|that) creature enters.*draw/i.test(ability)) {
      const s = 72
      if (!best || s > best.score) {
        best = { score: s, reason: 'Draw when this creature enters (not a general creature trigger)' }
      }
      continue
    }

    const s = 92
    if (!best || s > best.score) {
      best = { score: s, reason: 'Draw when a creature enters the battlefield' }
    }
  }

  return best
}

function scoreTutor(abilities: string[], target: string | null): ScoredAbility | null {
  let best: ScoredAbility | null = null

  for (const ability of abilities) {
    if (!/search your library/i.test(ability)) continue

    const isLand = /search your library for (?:a |up to .* )?(?:[\w ]+ )?land/i.test(ability)
    if (isLand && target !== 'land') continue

    if (target === 'land') {
      if (isLand) return { score: 96, reason: 'Tutor for a land' }
      continue
    }

    if (isLand) continue

    if (/search your library for a card/i.test(ability)) {
      best = { score: 97, reason: 'Tutor — search library for any card' }
      break
    }

    const typePatterns: Record<string, RegExp> = {
      creature: /search your library for (?:a |up to .* )?(?:[\w ]+ )?creature/i,
      artifact: /search your library for (?:a |up to .* )?(?:[\w ]+ )?artifact/i,
      enchantment: /search your library for (?:a |up to .* )?(?:[\w ]+ )?enchantment/i,
      spell: /search your library for (?:a |up to .* )?(?:[\w ]+ )?(?:instant|sorcery|spell)/i,
      planeswalker: /search your library for (?:a |up to .* )?(?:[\w ]+ )?planeswalker/i,
    }

    if (target && typePatterns[target]?.test(ability)) {
      const s = 98
      if (!best || s > best.score) {
        best = { score: s, reason: `Tutor — search library for a ${target}` }
      }
      continue
    }

    if (/search your library for/i.test(ability) && !isLand) {
      const s = 93
      if (!best || s > best.score) {
        best = { score: s, reason: 'Tutor — search your library for a card' }
      }
    }
  }

  return best
}

function scoreByPattern(
  abilities: string[],
  pattern: RegExp,
  anti: RegExp[],
  score: number,
  reason: string,
): ScoredAbility | null {
  for (const ability of abilities) {
    if (anti.some((re) => re.test(ability))) continue
    if (pattern.test(ability)) return { score, reason }
  }
  return null
}

type IntentHandler = {
  id: string
  detect: (p: string, jargon: string[]) => boolean
  score: (abilities: string[], p: string) => ScoredAbility | null
  describe: string
}

const HANDLERS: IntentHandler[] = [
  {
    id: 'keywords',
    detect: (p) => detectKeywordsInText(normalizePrompt(expandSlangInPrompt(p))).length > 0,
    score: () => null,
    describe: 'Cards with keyword abilities',
  },
  {
    id: 'creature-etb-draw',
    detect: (p) =>
      /when(?:ever)? (?:a |an |another |each )?creature/.test(p) &&
      /enter/.test(p) &&
      /draw/.test(p),
    score: (abilities) => scoreCreatureEnterDraw(abilities),
    describe: 'Draw when a creature enters the battlefield',
  },
  {
    id: 'tutor',
    detect: (p, jargon) =>
      jargon.includes('tutor') ||
      (/\bsearch\b/.test(p) && /\blibrary\b/.test(p) && !/land/.test(p)),
    score: (abilities, p) => scoreTutor(abilities, extractTutorTarget(p)),
    describe: 'Tutor — search library for a specific card',
  },
  {
    id: 'land-tutor',
    detect: (p) =>
      (/\bsearch\b/.test(p) && /\blibrary\b/.test(p) && /\bland/.test(p)) ||
      (/\bramp\b/.test(p) && /\bland/.test(p)),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /search your library for (?:a |up to .* )?(?:[\w ]+ )?land/i,
        [],
        94,
        'Search library for lands',
      ),
    describe: 'Land ramp — search for lands',
  },
  {
    id: 'ramp',
    detect: (p, jargon) => jargon.includes('ramp') && !/\btutor\b/.test(p),
    score: (abilities) => {
      const land = scoreByPattern(
        abilities,
        /search your library for (?:a |up to .* )?(?:[\w ]+ )?land|put .* land .* onto the battlefield/i,
        [],
        90,
        'Put lands onto the battlefield',
      )
      const mana = scoreByPattern(
        abilities,
        /\{T\}: Add \{[WUBRGC]|add \{[WUBRGC]/i,
        [],
        85,
        'Mana acceleration',
      )
      const treasure = scoreByPattern(
        abilities,
        /create .* Treasure tokens?/i,
        [],
        82,
        'Create Treasure tokens',
      )
      return land ?? mana ?? treasure
    },
    describe: 'Ramp — mana or lands',
  },
  {
    id: 'removal',
    detect: (p, jargon) =>
      jargon.includes('removal') || /destroy target|exile target|remove target/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /(?:destroy|exile) target (?:[\w,-]+ )?(?:creature|permanent|artifact|enchantment|planeswalker)/i,
        [/destroy all/i],
        95,
        'Targeted removal — destroy or exile',
      ),
    describe: 'Targeted removal',
  },
  {
    id: 'wipe',
    detect: (p, jargon) =>
      jargon.includes('wipe') || /destroy all creatures|board wipe|mass removal/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /destroy all (?:[\w ]+ )?creatures|destroy all nonland|all creatures get -[\dX]/i,
        [],
        96,
        'Board wipe',
      ),
    describe: 'Board wipe',
  },
  {
    id: 'counterspell',
    detect: (p, jargon) =>
      jargon.includes('counterspell') || /counter target (?:spell|ability)/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /counter target (?:[\w ]+ )?(?:spell|ability)/i,
        [],
        97,
        'Counter target spell',
      ),
    describe: 'Counterspell',
  },
  {
    id: 'draw',
    detect: (p, jargon) =>
      (jargon.includes('draw') || /\bdraw (?:a |one |cards?)\b/.test(p)) &&
      !/when|whenever/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /(?:^|[,.]\s*)(?:you )?(?:may )?draw (?:a |one |two |three |\d )?cards?(?!\s+except)/i,
        [/when(?:ever)? (?:an |a )?opponent draws/i],
        90,
        'Draw cards',
      ),
    describe: 'Draw cards',
  },
  {
    id: 'cast-draw',
    detect: (p) => /when(?:ever)? you cast/.test(p) && /draw/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /when(?:ever)? you cast (?:a |an |your )?(?:[\w ]+ )?(?:spell|instant|sorcery|creature|artifact|enchantment)[,.\s]+(?:you )?draw/i,
        [/when(?:ever)? (?:an |a )?opponent casts/i],
        94,
        'Draw when you cast a spell',
      ),
    describe: 'Draw when you cast',
  },
  {
    id: 'dies-draw',
    detect: (p) => /when(?:ever)? (?:a |an )?creature.* dies/.test(p) && /draw/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /when(?:ever)? (?:a |an |another |each )?(?:[\w ]+ )?creature(?:s)? (?:you control )?(?:die|dies)[,.\s]+(?:you )?draw/i,
        [],
        94,
        'Draw when a creature dies',
      ),
    describe: 'Draw when a creature dies',
  },
  {
    id: 'reanimate',
    detect: (p, jargon) =>
      jargon.includes('reanimate') || /return .* from graveyard|reanimat/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /return (?:target )?(?:[\w,-]+ )*(?:card|creature|permanent) (?:card )?from (?:your |a )?graveyard to (?:the battlefield|your hand)/i,
        [],
        95,
        'Return from graveyard',
      ),
    describe: 'Reanimation / recursion',
  },
  {
    id: 'mill',
    detect: (p, jargon) => jargon.includes('mill') || /\bmill\b/.test(p),
    score: (abilities) =>
      scoreByPattern(abilities, /mill (?:a |one |two |three |cards?|\d)/i, [], 93, 'Mill cards'),
    describe: 'Mill',
  },
  {
    id: 'tokens',
    detect: (p, jargon) =>
      jargon.includes('token') || (/create/.test(p) && /token/.test(p)),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /create (?:a |two |three |[\dX]+ )?(?:[\w,-]+ )*tokens?/i,
        [],
        92,
        'Create tokens',
      ),
    describe: 'Create tokens',
  },
  {
    id: 'burn',
    detect: (p, jargon) =>
      jargon.includes('burn') || /deal .* damage to (?:any target|target)/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /deal [\dX]+ damage to (?:any target|target creature|target player|target opponent)/i,
        [],
        91,
        'Deal damage — burn spell',
      ),
    describe: 'Direct damage',
  },
  {
    id: 'blink',
    detect: (_p, jargon) => jargon.includes('blink'),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /exile .* return .* to the battlefield/i,
        [],
        93,
        'Blink — exile and return',
      ),
    describe: 'Blink / flicker',
  },
  {
    id: 'landfall',
    detect: (_p, jargon) => jargon.includes('landfall'),
    score: (abilities) =>
      scoreByPattern(abilities, /landfall/i, [], 94, 'Landfall trigger'),
    describe: 'Landfall',
  },
  {
    id: 'sacrifice',
    detect: (p, jargon) =>
      jargon.includes('sacrifice') || (/sacrifice/.test(p) && /draw|damage|token|drain/.test(p)),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /sacrifice (?:a |an |another )?(?:[\w,-]+ )+(?:[,.\s]+(?:you )?(?:draw|deal|create|gain|lose))/i,
        [],
        90,
        'Sacrifice for value',
      ),
    describe: 'Sacrifice outlet / payoff',
  },
  {
    id: 'lifegain',
    detect: (p) => /gain .* life|lifegain/.test(p),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /(?:you )?gain (?:[\dX]+ )?life/i,
        [/lose (?:[\dX]+ )?life/i],
        88,
        'Gain life',
      ),
    describe: 'Lifegain',
  },
  {
    id: 'graveyard-hate',
    detect: (_p, jargon) => jargon.includes('graveyard-hate'),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /exile (?:target )?(?:all )?(?:cards from )?(?:each )?graveyard/i,
        [],
        94,
        'Graveyard hate',
      ),
    describe: 'Graveyard hate',
  },
  {
    id: 'tax',
    detect: (_p, jargon) => jargon.includes('tax'),
    score: (abilities) =>
      scoreByPattern(
        abilities,
        /unless .* pays?|spells? cost .* more|activated abilities cost .* more/i,
        [],
        90,
        'Tax / stax effect',
      ),
    describe: 'Tax effects',
  },
]

function resolveHandlers(prompt: string): IntentHandler[] {
  const p = normalizePrompt(expandSlangInPrompt(prompt))
  const jargon = detectJargon(p)
  return HANDLERS.filter((h) => h.detect(p, jargon))
}

function scoreCard(card: CardRecord, handlers: IntentHandler[], prompt: string): {
  score: number
  reasons: string[]
} {
  const expanded = normalizePrompt(expandSlangInPrompt(prompt))
  const abilities = splitAbilities(card.oracle_text)
  const keywords = detectKeywordsInText(expanded)
  let best = 0
  const reasons: string[] = []

  for (const handler of handlers) {
    const result = handler.score(abilities, expanded)
    if (result && result.score > best) {
      best = result.score
      reasons.length = 0
      reasons.push(result.reason)
    }
  }

  const kwResult = scoreCardKeywords(card, keywords)
  if (kwResult && kwResult.score > best) {
    best = kwResult.score
    reasons.length = 0
    reasons.push(kwResult.reason)
  } else if (kwResult && handlers.length === 0) {
    best = Math.max(best, kwResult.score)
    if (reasons.length === 0) reasons.push(kwResult.reason)
  }

  const slangResult = scoreCardForSlang(card, prompt)
  if (slangResult && slangResult.score > best) {
    best = slangResult.score
    reasons.length = 0
    reasons.push(slangResult.reason)
  }

  const termResult = scoreCardByTerms(card, prompt)
  if (termResult && termResult.score > best) {
    best = termResult.score
    reasons.length = 0
    reasons.push(termResult.reason)
  } else if (termResult) {
    best = Math.max(best, termResult.score)
    if (reasons.length === 0) reasons.push(termResult.reason)
  }

  if (best === 0) {
    return { score: 0, reasons: [] }
  }

  return { score: clamp(best, 0, 100), reasons }
}

export function describeCardPrompt(prompt: string): string {
  const slang = describeSlangInPrompt(prompt)
  const handlers = resolveHandlers(prompt)
  const expanded = normalizePrompt(expandSlangInPrompt(prompt))
  const keywords = detectKeywordsInText(expanded)
  const tribes = detectTribesInText(expanded)
  const terms = promptTerms(expanded)
  const parts: string[] = []
  if (slang) parts.push(slang)
  if (handlers.length > 0) {
    parts.push(`Looking for: ${handlers.map((h) => h.describe).join('; ')}`)
  }
  if (keywords.length > 0) {
    parts.push(`Keywords: ${keywords.map((k) => k.name).join(', ')}`)
  }
  if (tribes.length > 0) {
    parts.push(`Creature types: ${tribes.join(', ')}`)
  }
  if (terms.length > 0 && tribes.length === 0) {
    parts.push(`Matching name, type, and oracle for: ${terms.join(', ')}`)
  }
  if (parts.length === 0) {
    return 'Describe what you want — abilities like "tutor for a creature", keywords like "flying", or any word like "faerie" or "treasure"'
  }
  return parts.join(' · ')
}

export function matchCardsByPrompt(
  cards: CardRecord[],
  prompt: string,
  colorFilter: ColorFilter,
  limit = 60,
): { matches: CardPromptMatch[]; weakMatch: boolean } {
  const trimmed = prompt.trim()
  if (!trimmed) return { matches: [], weakMatch: false }

  const handlers = resolveHandlers(trimmed)

  const filtered = cards.filter((c) => fitsColorIdentity(c.color_identity, colorFilter))

  const scored = filtered
    .map((card) => {
      const { score, reasons } = scoreCard(card, handlers, trimmed)
      return {
        card,
        score,
        matchPercent: score,
        reasons,
      }
    })
    .filter((s) => s.score >= MIN_STRONG_MATCH_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.card.edhrec_rank ?? 999999) - (b.card.edhrec_rank ?? 999999)
    })
    .slice(0, limit)

  const weakMatch =
    scored.length === 0 || (scored[0]?.score ?? 0) < 70

  return { matches: scored, weakMatch }
}
