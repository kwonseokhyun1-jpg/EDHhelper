import type { CommanderMatch, CommanderPairMatch, CommanderRecord } from '../types/commander'
import type { ColorFilter } from '../types/mtg'
import { ARCHETYPES } from './archetypes'
import {
  MIN_COMMANDER_MATCH_PERCENT,
  matchCommanders,
  scoreCommander,
  suggestSimilarCommanders,
} from './commander-match'
import { resolveCommanderIntent } from './commander-intent'
import { fitsColorIdentity } from './color-filter'
import { type CommanderSort } from './edhrec'
import { chatCompletion, groqErrorMessage } from './groq-chat'
import { matchCommanderPairs } from './partner-match'

const ARCHETYPE_IDS = ARCHETYPES.map((a) => a.id).join(', ')

export type CommanderThemeInterpretation = {
  summary: string
  expandedTheme: string
  archetypes: string[]
  tribes: string[]
  keywords: string[]
  oraclePhrases: string[]
  containsWords: string[]
}

const INTERPRET_SYSTEM = `You interpret natural-language Magic: The Gathering Commander deck theme / playstyle search prompts.

Players describe vibes, archetypes, tribes, and mechanics using slang. Translate into structured commander search intent.

Return JSON only with this exact shape:
{
  "summary": "one short sentence describing commanders to find",
  "expandedTheme": "rewritten theme using MTG Commander vocabulary and player jargon",
  "archetypes": ["archetype ids from this list only"],
  "tribes": ["creature subtypes like wolf, elf, zombie, faerie"],
  "keywords": ["MTG keyword abilities like flying, haste, deathtouch"],
  "oraclePhrases": ["phrases likely in a commander's oracle text, lowercase"],
  "containsWords": ["individual words to match in name or text"]
}

Valid archetype ids: ${ARCHETYPE_IDS}

Examples:
- "stax taxes" → archetypes: ["stax"], oraclePhrases: ["unless that player pays", "spells cost"]
- "wolf tribal" → tribes: ["wolf"], archetypes: ["tribal"]
- "enchantress" → archetypes: ["enchantments"]
- "wheel" → archetypes: ["wheel"]
- "aristocrats sacrifice" → archetypes: ["aristocrats"]
- "lands matter" → archetypes: ["lands"]
- "spellslinger" → archetypes: ["spellslinger"]
- "reanimator" → archetypes: ["graveyard"]
- "superfriends" → archetypes: ["superfriends"]
- "theft" → archetypes: ["theft"]
- "blue farm" → archetypes: ["spellslinger", "control"]
- "pillowfort" → archetypes: ["stax"]

Rules:
- Keep oraclePhrases short (2–10 words), realistic for legendary creature text
- Do not invent specific commander card names unless the user named one
- Use empty arrays when not applicable`

function parseInterpretation(raw: string, theme: string): CommanderThemeInterpretation {
  const parsed = JSON.parse(raw) as Partial<CommanderThemeInterpretation>
  const validArchetypes = new Set(ARCHETYPES.map((a) => a.id))

  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []

  return {
    summary:
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : theme.trim(),
    expandedTheme:
      typeof parsed.expandedTheme === 'string' && parsed.expandedTheme.trim()
        ? parsed.expandedTheme.trim()
        : theme.trim(),
    archetypes: strList(parsed.archetypes).filter((id) => validArchetypes.has(id)),
    tribes: strList(parsed.tribes).map((s) => s.toLowerCase()),
    keywords: strList(parsed.keywords),
    oraclePhrases: strList(parsed.oraclePhrases).map((s) => s.toLowerCase()),
    containsWords: strList(parsed.containsWords).map((s) => s.toLowerCase()),
  }
}

export async function interpretCommanderTheme(
  theme: string,
): Promise<{ interpretation: CommanderThemeInterpretation | null; error?: string }> {
  const trimmed = theme.trim()
  if (!trimmed) return { interpretation: null }

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
    return { interpretation: parseInterpretation(raw, trimmed) }
  } catch (err) {
    return { interpretation: null, error: groqErrorMessage(err) }
  }
}

export function describeGroqCommanderInterpretation(
  interpretation: CommanderThemeInterpretation,
): string {
  const parts: string[] = [interpretation.summary]
  if (interpretation.archetypes.length > 0) {
    const labels = interpretation.archetypes.map(
      (id) => ARCHETYPES.find((a) => a.id === id)?.label ?? id,
    )
    parts.push(`Archetypes: ${labels.join(', ')}`)
  }
  if (interpretation.tribes.length > 0) {
    parts.push(`Tribes: ${interpretation.tribes.join(', ')}`)
  }
  if (interpretation.keywords.length > 0) {
    parts.push(`Keywords: ${interpretation.keywords.join(', ')}`)
  }
  if (interpretation.oraclePhrases.length > 0) {
    parts.push(`Oracle: ${interpretation.oraclePhrases.slice(0, 3).join('; ')}`)
  }
  return parts.join(' · ')
}

function buildEnrichedTheme(
  original: string,
  interpretation: CommanderThemeInterpretation,
): string {
  return [
    original,
    interpretation.expandedTheme,
    ...interpretation.archetypes,
    ...interpretation.tribes,
    ...interpretation.keywords,
    ...interpretation.containsWords,
    ...interpretation.oraclePhrases,
  ]
    .filter(Boolean)
    .join(' ')
}

function mergeCommanderMatches(...groups: CommanderMatch[][]): CommanderMatch[] {
  const byId = new Map<string, CommanderMatch>()

  for (const group of groups) {
    for (const match of group) {
      const existing = byId.get(match.commander.id)
      if (
        !existing ||
        match.matchPercent > existing.matchPercent ||
        (match.matchPercent === existing.matchPercent && match.score > existing.score)
      ) {
        byId.set(match.commander.id, match)
      } else if (existing && match.matchPercent === existing.matchPercent) {
        existing.reasons = [...new Set([...existing.reasons, ...match.reasons])].slice(0, 5)
      }
    }
  }

  return [...byId.values()]
}

function applyOracleBoost(
  matches: CommanderMatch[],
  phrases: string[],
): CommanderMatch[] {
  if (phrases.length === 0) return matches

  return matches
    .map((match) => {
      const oracle = match.commander.oracle_text.toLowerCase()
      const matched = phrases.filter((p) => p.length >= 3 && oracle.includes(p))
      if (matched.length === 0) return match

      const boost = Math.min(28, matched.length * 10)
      const matchPercent = Math.min(100, match.matchPercent + boost)
      return {
        ...match,
        matchPercent,
        score: match.score + boost * 10,
        reasons: [`Oracle matches "${matched[0]}"`, ...match.reasons].slice(0, 5),
      }
    })
    .sort((a, b) => {
      if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent
      return b.score - a.score
    })
}

function oraclePhraseCommanders(
  commanders: CommanderRecord[],
  theme: string,
  colorFilter: ColorFilter,
  interpretation: CommanderThemeInterpretation,
): CommanderMatch[] {
  const phrases = interpretation.oraclePhrases
  if (phrases.length === 0) return []

  const filtered = commanders.filter((c) => fitsColorIdentity(c.color_identity, colorFilter))
  const enriched = buildEnrichedTheme(theme, interpretation)
  const intent = resolveCommanderIntent(enriched, commanders, true)

  return filtered
    .map((commander) => {
      const oracle = commander.oracle_text.toLowerCase()
      const matched = phrases.filter((p) => p.length >= 3 && oracle.includes(p))
      if (matched.length === 0) return null

      const scored = scoreCommander(commander, intent, theme)
      const oraclePct = Math.min(96, 42 + matched.length * 14)
      const matchPercent = Math.max(scored.matchPercent, oraclePct)

      if (matchPercent < MIN_COMMANDER_MATCH_PERCENT) return null

      return {
        commander,
        score: scored.score + oraclePct * 5,
        matchPercent,
        matchedTags: scored.matchedTags,
        reasons: [`Oracle matches "${matched[0]}"`, ...scored.reasons].slice(0, 5),
      }
    })
    .filter((m): m is CommanderMatch => m != null)
}

export type GroqCommanderMatchResult = {
  matches: CommanderMatch[]
  interpretation: CommanderThemeInterpretation | null
  usedGroq: boolean
  groqUnavailable: boolean
  groqError?: string
}

export async function matchCommandersByGroqTheme(
  commanders: CommanderRecord[],
  theme: string,
  colorFilter: ColorFilter,
  limit = 60,
  sort: CommanderSort = 'match',
): Promise<GroqCommanderMatchResult> {
  const trimmed = theme.trim()
  if (!trimmed) {
    return {
      matches: matchCommanders(commanders, theme, colorFilter, limit, sort),
      interpretation: null,
      usedGroq: false,
      groqUnavailable: false,
    }
  }

  const { interpretation, error: groqError } = await interpretCommanderTheme(trimmed)
  if (!interpretation) {
    return {
      matches: matchCommanders(commanders, trimmed, colorFilter, limit, sort, { raw: true }),
      interpretation: null,
      usedGroq: false,
      groqUnavailable: true,
      groqError,
    }
  }

  const enriched = buildEnrichedTheme(trimmed, interpretation)
  const rawOpts = { raw: true as const }

  const fromEnriched = matchCommanders(
    commanders,
    enriched,
    colorFilter,
    limit,
    sort,
    rawOpts,
  )
  const fromOriginal = matchCommanders(
    commanders,
    trimmed,
    colorFilter,
    limit,
    sort,
    rawOpts,
  )
  const fromOracle = oraclePhraseCommanders(
    commanders,
    trimmed,
    colorFilter,
    interpretation,
  )

  const merged = applyOracleBoost(
    mergeCommanderMatches(fromEnriched, fromOriginal, fromOracle),
    interpretation.oraclePhrases,
  )
    .sort((a, b) => {
      if (sort === 'popularity') {
        const ra = a.commander.edhrec_rank ?? 999999
        const rb = b.commander.edhrec_rank ?? 999999
        if (ra !== rb) return ra - rb
        return b.matchPercent - a.matchPercent || b.score - a.score
      }
      if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent
      return b.score - a.score
    })
    .slice(0, limit)

  return {
    matches: merged,
    interpretation,
    usedGroq: true,
    groqUnavailable: false,
  }
}

export type GroqCommanderPairResult = {
  pairs: CommanderPairMatch[]
  interpretation: CommanderThemeInterpretation | null
  usedGroq: boolean
  groqUnavailable: boolean
  groqError?: string
}

export async function matchCommanderPairsByGroqTheme(
  commanders: CommanderRecord[],
  theme: string,
  colorFilter: ColorFilter,
  limit = 24,
  sort: CommanderSort = 'match',
): Promise<GroqCommanderPairResult> {
  const trimmed = theme.trim()
  if (!trimmed) {
    return {
      pairs: matchCommanderPairs(commanders, theme, colorFilter, limit, sort),
      interpretation: null,
      usedGroq: false,
      groqUnavailable: false,
    }
  }

  const { interpretation, error: groqError } = await interpretCommanderTheme(trimmed)
  if (!interpretation) {
    return {
      pairs: matchCommanderPairs(commanders, trimmed, colorFilter, limit, sort, { raw: true }),
      interpretation: null,
      usedGroq: false,
      groqUnavailable: true,
      groqError,
    }
  }

  const enriched = buildEnrichedTheme(trimmed, interpretation)
  const rawOpts = { raw: true as const }

  const fromEnriched = matchCommanderPairs(
    commanders,
    enriched,
    colorFilter,
    limit,
    sort,
    rawOpts,
  )
  const fromOriginal = matchCommanderPairs(
    commanders,
    trimmed,
    colorFilter,
    limit,
    sort,
    rawOpts,
  )

  const byKey = new Map<string, CommanderPairMatch>()
  for (const group of [fromEnriched, fromOriginal]) {
    for (const pair of group) {
      const key = [pair.primary.id, pair.partner.id].sort().join('|')
      const existing = byKey.get(key)
      if (!existing || pair.score > existing.score) {
        byKey.set(key, pair)
      }
    }
  }

  const pairs = [...byKey.values()]
    .sort((a, b) => {
      if (sort === 'popularity') {
        const ar = (a.primary.edhrec_rank ?? 999999) + (a.partner.edhrec_rank ?? 999999)
        const br = (b.primary.edhrec_rank ?? 999999) + (b.partner.edhrec_rank ?? 999999)
        if (ar !== br) return ar - br
        return b.score - a.score
      }
      return b.score - a.score
    })
    .slice(0, limit)

  return {
    pairs,
    interpretation,
    usedGroq: true,
    groqUnavailable: false,
  }
}

export function suggestSimilarCommandersGroq(
  commanders: CommanderRecord[],
  theme: string,
  colorFilter: ColorFilter,
  interpretation: CommanderThemeInterpretation | null,
  limit = 8,
): CommanderMatch[] {
  const searchTheme =
    interpretation != null ? buildEnrichedTheme(theme, interpretation) : theme
  return suggestSimilarCommanders(commanders, searchTheme, colorFilter, limit, { raw: true })
}
