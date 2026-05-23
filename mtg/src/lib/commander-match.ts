import type { CommanderMatch, CommanderRecord } from '../types/commander'
import type { ColorFilter } from '../types/mtg'
import { ARCHETYPES, archetypeById, resolveThemeArchetypes } from './archetypes'
import { fitsColorIdentity } from './color-filter'
import { type CommanderSort, edhrecScoreBoost } from './edhrec'
import { normalizeWithTypos } from './fuzzy-text'
import { detectKeywordsInText, scoreCommanderKeywords } from './mtg-keywords'

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'deck', 'commander', 'that', 'this',
  'want', 'need', 'like', 'play', 'style', 'based', 'around',
])

function tokens(theme: string): string[] {
  const { text } = normalizeWithTypos(theme)
  return text
    .replace(/[^a-z0-9+\-/\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}


export function scoreCommander(
  commander: CommanderRecord,
  theme: string,
  themeArchetypes: string[],
  themeKeywords = detectKeywordsInText(theme),
): { score: number; matchedTags: string[]; reasons: string[] } {
  const text = `${commander.name} ${commander.type_line} ${commander.oracle_text}`.toLowerCase()
  const words = tokens(theme)
  let score = 0
  const matchedTags = new Set<string>()
  const reasons: string[] = []

  for (const archId of themeArchetypes) {
    if (commander.tags.includes(archId)) {
      score += 28
      matchedTags.add(archId)
      const label = archetypeById(archId)?.label ?? archId
      reasons.push(`Fits ${label.toLowerCase()} archetype`)
    }
  }

  for (const arch of ARCHETYPES) {
    if (!themeArchetypes.includes(arch.id)) continue
    for (const re of arch.signals) {
      if (re.test(commander.oracle_text) || re.test(commander.type_line)) {
        score += 6
        matchedTags.add(arch.id)
        break
      }
    }
  }

  for (const word of words) {
    if (commander.name.toLowerCase().includes(word)) {
      score += 14
      reasons.push(`Name matches "${word}"`)
    }
    if (commander.type_line.toLowerCase().includes(word)) {
      score += 8
    }
    if (commander.oracle_text.toLowerCase().includes(word)) {
      score += 5
    }
    for (const tag of commander.tags) {
      const arch = archetypeById(tag)
      if (arch?.aliases.some((a) => a.includes(word) || word.includes(a))) {
        score += 10
        matchedTags.add(tag)
      }
    }
  }

  if (theme.trim()) {
    const phrase = theme.toLowerCase().trim()
    if (text.includes(phrase)) {
      score += 35
      reasons.push('Oracle text matches your phrase')
    }
  }

  if (themeKeywords.length > 0) {
    const kw = scoreCommanderKeywords(commander, themeKeywords)
    score += kw.score
    for (const r of kw.reasons) reasons.push(r)
    for (const id of kw.matchedKeywordIds) matchedTags.add(id)
  }

  score += edhrecScoreBoost(commander.edhrec_rank)

  return { score, matchedTags: [...matchedTags], reasons: [...new Set(reasons)].slice(0, 4) }
}

export function matchCommanders(
  commanders: CommanderRecord[],
  theme: string,
  colorFilter: ColorFilter,
  limit = 120,
  sort: CommanderSort = 'match',
): CommanderMatch[] {
  const { text: normalizedTheme } = normalizeWithTypos(theme)
  const themeArchetypes = resolveThemeArchetypes(normalizedTheme)
  const themeKeywords = detectKeywordsInText(normalizedTheme)
  const filtered = commanders.filter((c) =>
    fitsColorIdentity(c.color_identity, colorFilter),
  )

  const scored = filtered.map((commander) => {
    const { score, matchedTags, reasons } = scoreCommander(
      commander,
      normalizedTheme,
      themeArchetypes,
      themeKeywords,
    )
    return { commander, score, matchedTags, reasons }
  })

  const hasTheme =
    normalizedTheme.trim().length > 0 ||
    themeArchetypes.length > 0 ||
    themeKeywords.length > 0

  const sorted = scored
    .filter((s) => (hasTheme ? s.score > 0 : true))
    .sort((a, b) => {
      if (sort === 'popularity') {
        const ra = a.commander.edhrec_rank ?? 999999
        const rb = b.commander.edhrec_rank ?? 999999
        if (ra !== rb) return ra - rb
        return b.score - a.score
      }
      if (b.score !== a.score) return b.score - a.score
      return (a.commander.edhrec_rank ?? 999999) - (b.commander.edhrec_rank ?? 999999)
    })
    .slice(0, limit)

  const maxScore = Math.max(...sorted.map((s) => s.score), 1)

  return sorted.map((s) => ({
    ...s,
    matchPercent: hasTheme ? Math.round((s.score / maxScore) * 100) : 0,
  }))
}

export function describeTheme(theme: string): string {
  const { text } = normalizeWithTypos(theme)
  const parts: string[] = []
  const archs = resolveThemeArchetypes(text)
  if (archs.length > 0) {
    const labels = archs.map((id) => archetypeById(id)?.label ?? id)
    parts.push(`Archetypes: ${labels.join(', ')}`)
  }
  const kws = detectKeywordsInText(text)
  if (kws.length > 0) {
    parts.push(`Keywords: ${kws.map((k) => k.name).join(', ')}`)
  }
  return parts.join(' · ')
}
