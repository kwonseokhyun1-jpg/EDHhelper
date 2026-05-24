import type { CardMatch, CardRecord } from '../types/card'
import type { ColorFilter } from '../types/mtg'
import { ARCHETYPES, archetypeById, resolveThemeArchetypes } from './archetypes'
import { fitsColorIdentity } from './color-filter'
import { type CommanderSort, edhrecScoreBoost } from './edhrec'
import { normalizeWithTypos } from './fuzzy-text'
import { detectKeywordsInText, scoreCommanderKeywords } from './mtg-keywords'

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'deck', 'card', 'that', 'this',
  'want', 'need', 'like', 'play', 'style', 'based', 'around',
])

function tokens(theme: string): string[] {
  const { text } = normalizeWithTypos(theme)
  return text
    .replace(/[^a-z0-9+\-/\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}

export function scoreCard(
  card: CardRecord,
  theme: string,
  themeArchetypes: string[],
  themeKeywords = detectKeywordsInText(theme),
): { score: number; matchedTags: string[]; reasons: string[] } {
  const text = `${card.name} ${card.type_line} ${card.oracle_text}`.toLowerCase()
  const words = tokens(theme)
  let score = 0
  const matchedTags = new Set<string>()
  const reasons: string[] = []

  for (const archId of themeArchetypes) {
    if (card.tags.includes(archId)) {
      score += 28
      matchedTags.add(archId)
      const label = archetypeById(archId)?.label ?? archId
      reasons.push(`Fits ${label.toLowerCase()} archetype`)
    }
  }

  for (const arch of ARCHETYPES) {
    if (!themeArchetypes.includes(arch.id)) continue
    for (const re of arch.signals) {
      if (re.test(card.oracle_text) || re.test(card.type_line)) {
        score += 6
        matchedTags.add(arch.id)
        break
      }
    }
  }

  for (const word of words) {
    if (card.name.toLowerCase().includes(word)) {
      score += 14
      reasons.push(`Name matches "${word}"`)
    }
    if (card.type_line.toLowerCase().includes(word)) {
      score += 8
    }
    if (card.oracle_text.toLowerCase().includes(word)) {
      score += 5
    }
    for (const tag of card.tags) {
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
    const kw = scoreCommanderKeywords(card, themeKeywords)
    score += kw.score
    for (const r of kw.reasons) reasons.push(r)
    for (const id of kw.matchedKeywordIds) matchedTags.add(id)
  }

  score += edhrecScoreBoost(card.edhrec_rank)

  return { score, matchedTags: [...matchedTags], reasons: [...new Set(reasons)].slice(0, 4) }
}

export function matchCards(
  cards: CardRecord[],
  theme: string,
  colorFilter: ColorFilter,
  limit = 60,
  sort: CommanderSort = 'match',
): CardMatch[] {
  const { text: normalizedTheme } = normalizeWithTypos(theme)
  const themeArchetypes = resolveThemeArchetypes(normalizedTheme)
  const themeKeywords = detectKeywordsInText(normalizedTheme)
  const filtered = cards.filter((c) => fitsColorIdentity(c.color_identity, colorFilter))

  const scored = filtered.map((card) => {
    const { score, matchedTags, reasons } = scoreCard(
      card,
      normalizedTheme,
      themeArchetypes,
      themeKeywords,
    )
    return { card, score, matchedTags, reasons }
  })

  const hasTheme =
    normalizedTheme.trim().length > 0 ||
    themeArchetypes.length > 0 ||
    themeKeywords.length > 0

  const sorted = scored
    .filter((s) => (hasTheme ? s.score > 0 : true))
    .sort((a, b) => {
      if (sort === 'popularity') {
        const ra = a.card.edhrec_rank ?? 999999
        const rb = b.card.edhrec_rank ?? 999999
        if (ra !== rb) return ra - rb
        return b.score - a.score
      }
      if (b.score !== a.score) return b.score - a.score
      return (a.card.edhrec_rank ?? 999999) - (b.card.edhrec_rank ?? 999999)
    })
    .slice(0, limit)

  const maxScore = Math.max(...sorted.map((s) => s.score), 1)

  return sorted.map((s) => ({
    ...s,
    matchPercent: hasTheme ? Math.round((s.score / maxScore) * 100) : 0,
  }))
}
