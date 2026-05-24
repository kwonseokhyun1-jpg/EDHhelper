import type { CardRecord } from '../types/card'
import type { ColorFilter } from '../types/mtg'
import { parseCreatureTypes } from './commander-tribes'
import {
  type CardPromptMatch,
  MIN_STRONG_MATCH_SCORE,
  matchCardsByPrompt,
} from './card-prompt-match'
import { fitsColorIdentity } from './color-filter'
import { chatCompletion } from './groq-chat'

export type CardPromptInterpretation = {
  summary: string
  expandedPrompt: string
  oraclePhrases: string[]
  keywords: string[]
  types: string[]
  tribes: string[]
  containsWords: string[]
  jargonHints: string[]
  cmcMin?: number
  cmcMax?: number
}

const INTERPRET_SYSTEM = `You interpret natural-language Magic: The Gathering Commander card search prompts.

Players use slang and vague descriptions. Translate them into concrete oracle-text concepts.

Return JSON only with this exact shape:
{
  "summary": "one short sentence describing what cards to find",
  "expandedPrompt": "rewritten prompt using MTG oracle vocabulary and player jargon",
  "oraclePhrases": ["phrases likely to appear verbatim or nearly in oracle text, lowercase"],
  "keywords": ["MTG keyword abilities like flying, trample, deathtouch"],
  "types": ["card types: Creature, Instant, Sorcery, Artifact, Enchantment, Planeswalker, Land"],
  "tribes": ["creature subtypes like faerie, goblin, elf"],
  "containsWords": ["individual oracle words to match"],
  "jargonHints": ["one or more of: tutor, ramp, removal, wipe, draw, counterspell, reanimate, mill, blink, token, sacrifice, protection, burn, etb, landfall, treasure, proliferate, discard, graveyard-hate, tax"],
  "cmcMin": null,
  "cmcMax": null
}

Rules:
- "board wipe" → oraclePhrases like "destroy all creatures", jargonHints: ["wipe"]
- "tutor for a creature" → oraclePhrases like "search your library for a creature", jargonHints: ["tutor"]
- "ramp" → mana rocks, land search, treasure tokens; jargonHints: ["ramp"]
- "faerie" → tribes: ["faerie"]
- "flying blocker" → keywords: ["flying"], types: ["Creature"], expandedPrompt mentions defensive creature
- Use null for cmcMin/cmcMax when not specified
- Keep oraclePhrases short (2–8 words), realistic for MTG card text
- Do not invent specific card names`


function parseInterpretation(raw: string, prompt: string): CardPromptInterpretation {
  const parsed = JSON.parse(raw) as Partial<CardPromptInterpretation> & {
    cmcMin?: number | null
    cmcMax?: number | null
  }

  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []

  const cmcMin =
    typeof parsed.cmcMin === 'number' && parsed.cmcMin >= 0 ? parsed.cmcMin : undefined
  const cmcMax =
    typeof parsed.cmcMax === 'number' && parsed.cmcMax >= 0 ? parsed.cmcMax : undefined

  return {
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : prompt.trim(),
    expandedPrompt:
      typeof parsed.expandedPrompt === 'string' && parsed.expandedPrompt.trim()
        ? parsed.expandedPrompt.trim()
        : prompt.trim(),
    oraclePhrases: strList(parsed.oraclePhrases).map((s) => s.toLowerCase()),
    keywords: strList(parsed.keywords),
    types: strList(parsed.types),
    tribes: strList(parsed.tribes).map((s) => s.toLowerCase()),
    containsWords: strList(parsed.containsWords).map((s) => s.toLowerCase()),
    jargonHints: strList(parsed.jargonHints).map((s) => s.toLowerCase()),
    cmcMin,
    cmcMax,
  }
}

export async function interpretCardPrompt(
  prompt: string,
): Promise<CardPromptInterpretation | null> {
  const trimmed = prompt.trim()
  if (!trimmed) return null

  try {
    const raw = await chatCompletion({
      messages: [
        { role: 'system', content: INTERPRET_SYSTEM },
        { role: 'user', content: trimmed },
      ],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })
    return parseInterpretation(raw, trimmed)
  } catch {
    return null
  }
}

export function describeGroqInterpretation(
  interpretation: CardPromptInterpretation,
): string {
  const parts: string[] = [interpretation.summary]
  if (interpretation.jargonHints.length > 0) {
    parts.push(`Effects: ${interpretation.jargonHints.join(', ')}`)
  }
  if (interpretation.keywords.length > 0) {
    parts.push(`Keywords: ${interpretation.keywords.join(', ')}`)
  }
  if (interpretation.tribes.length > 0) {
    parts.push(`Tribes: ${interpretation.tribes.join(', ')}`)
  }
  if (interpretation.types.length > 0) {
    parts.push(`Types: ${interpretation.types.join(', ')}`)
  }
  if (interpretation.oraclePhrases.length > 0) {
    parts.push(`Oracle: ${interpretation.oraclePhrases.slice(0, 3).join('; ')}`)
  }
  return parts.join(' · ')
}

function buildEnrichedPrompt(
  original: string,
  interpretation: CardPromptInterpretation,
): string {
  return [
    original,
    interpretation.expandedPrompt,
    ...interpretation.jargonHints,
    ...interpretation.keywords,
    ...interpretation.tribes,
    ...interpretation.containsWords,
    ...interpretation.oraclePhrases,
  ]
    .filter(Boolean)
    .join(' ')
}

function filterCardsByInterpretation(
  cards: CardRecord[],
  interpretation: CardPromptInterpretation,
): CardRecord[] {
  let filtered = cards

  if (interpretation.types.length > 0) {
    const typesLower = interpretation.types.map((t) => t.toLowerCase())
    filtered = filtered.filter((c) => {
      const typeLine = c.type_line.toLowerCase()
      return typesLower.some((t) => typeLine.includes(t))
    })
  }

  if (interpretation.cmcMin != null) {
    filtered = filtered.filter((c) => c.cmc >= interpretation.cmcMin!)
  }
  if (interpretation.cmcMax != null) {
    filtered = filtered.filter((c) => c.cmc <= interpretation.cmcMax!)
  }

  if (interpretation.tribes.length > 0) {
    const tribes = interpretation.tribes
    filtered = filtered.filter((c) => {
      const creatureTypes = parseCreatureTypes(c.type_line)
      const oracle = c.oracle_text.toLowerCase()
      const name = c.name.toLowerCase()
      return tribes.some(
        (tribe) =>
          creatureTypes.some((ct) => ct.toLowerCase().includes(tribe)) ||
          oracle.includes(tribe) ||
          name.includes(tribe),
      )
    })
  }

  return filtered
}

function scoreOraclePhrases(
  card: CardRecord,
  phrases: string[],
): { score: number; reasons: string[] } | null {
  if (phrases.length === 0) return null

  const oracle = card.oracle_text.toLowerCase()
  const matched = phrases.filter((p) => p.length >= 3 && oracle.includes(p))
  if (matched.length === 0) return null

  const score = Math.min(96, 58 + matched.length * 14)
  return {
    score,
    reasons: [`Oracle matches "${matched[0]}"`],
  }
}

function mergeMatches(...groups: CardPromptMatch[][]): CardPromptMatch[] {
  const byId = new Map<string, CardPromptMatch>()

  for (const group of groups) {
    for (const match of group) {
      const existing = byId.get(match.card.id)
      if (!existing || match.score > existing.score) {
        byId.set(match.card.id, match)
      } else if (existing && match.score === existing.score) {
        existing.reasons = [
          ...new Set([...existing.reasons, ...match.reasons]),
        ].slice(0, 3)
      }
    }
  }

  return [...byId.values()]
}

function oraclePhraseCandidates(
  cards: CardRecord[],
  interpretation: CardPromptInterpretation,
): CardPromptMatch[] {
  const phrases = interpretation.oraclePhrases
  if (phrases.length === 0) return []

  return cards
    .map((card) => {
      const result = scoreOraclePhrases(card, phrases)
      if (!result || result.score < MIN_STRONG_MATCH_SCORE) return null
      return {
        card,
        score: result.score,
        matchPercent: result.score,
        reasons: result.reasons,
      }
    })
    .filter((m): m is CardPromptMatch => m != null)
}

export type GroqPromptMatchResult = {
  matches: CardPromptMatch[]
  weakMatch: boolean
  interpretation: CardPromptInterpretation | null
  usedGroq: boolean
  groqUnavailable: boolean
}

export async function matchCardsByGroqPrompt(
  cards: CardRecord[],
  prompt: string,
  colorFilter: ColorFilter,
  limit = 120,
): Promise<GroqPromptMatchResult> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return {
      matches: [],
      weakMatch: false,
      interpretation: null,
      usedGroq: false,
      groqUnavailable: false,
    }
  }

  const colorFiltered = cards.filter((c) =>
    fitsColorIdentity(c.color_identity, colorFilter),
  )

  const interpretation = await interpretCardPrompt(trimmed)

  if (!interpretation) {
    const local = matchCardsByPrompt(colorFiltered, trimmed, colorFilter, limit, {
      raw: true,
    })
    return {
      ...local,
      interpretation: null,
      usedGroq: false,
      groqUnavailable: true,
    }
  }

  const scoped = filterCardsByInterpretation(colorFiltered, interpretation)
  const searchPool = scoped.length > 0 ? scoped : colorFiltered
  const enriched = buildEnrichedPrompt(trimmed, interpretation)

  const rawOpts = { raw: true as const }

  const fromEnriched = matchCardsByPrompt(searchPool, enriched, colorFilter, limit, rawOpts)
  const fromOriginal = matchCardsByPrompt(searchPool, trimmed, colorFilter, limit, rawOpts)
  const fromOracle = oraclePhraseCandidates(searchPool, interpretation)

  const merged = mergeMatches(
    fromEnriched.matches,
    fromOriginal.matches,
    fromOracle,
  )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.card.edhrec_rank ?? 999999) - (b.card.edhrec_rank ?? 999999)
    })
    .slice(0, limit)

  const weakMatch =
    merged.length === 0 || (merged[0]?.score ?? 0) < 70

  return {
    matches: merged,
    weakMatch,
    interpretation,
    usedGroq: true,
    groqUnavailable: false,
  }
}
