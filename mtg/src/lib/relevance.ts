import type { ScryfallCard } from '../types/mtg'
import { cardOracleText } from '../api/scryfall'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'deck', 'commander',
  'that', 'this', 'want', 'need', 'like', 'cards', 'card', 'play',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\-/]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

export function scoreRelevance(card: ScryfallCard, prompt: string): number {
  const tokens = tokenize(prompt)
  if (tokens.length === 0) return 0

  const name = card.name.toLowerCase()
  const typeLine = (card.type_line ?? '').toLowerCase()
  const oracle = cardOracleText(card).toLowerCase()
  const keywords = (card.keywords ?? []).map((k) => k.toLowerCase()).join(' ')
  let score = 0
  const fullPrompt = prompt.toLowerCase().trim()

  if (fullPrompt && name.includes(fullPrompt)) score += 50
  if (fullPrompt && oracle.includes(fullPrompt)) score += 30

  for (const token of tokens) {
    if (name.includes(token)) score += 12
    if (typeLine.includes(token)) score += 6
    if (oracle.includes(token)) score += 4
    if (keywords.includes(token)) score += 8
  }

  if (card.edhrec_rank) {
    score += Math.max(0, 30 - Math.log10(card.edhrec_rank) * 8)
  }

  return score
}

export function sortByRelevance<T extends ScryfallCard>(
  cards: T[],
  prompt: string,
): T[] {
  return [...cards].sort(
    (a, b) => scoreRelevance(b, prompt) - scoreRelevance(a, prompt),
  )
}

export function sortCards(
  cards: ScryfallCard[],
  sort: string,
  dir: 'asc' | 'desc',
  prompt = '',
): ScryfallCard[] {
  const mult = dir === 'asc' ? 1 : -1

  if (sort === 'relevance' && prompt.trim()) {
    return sortByRelevance(cards, prompt)
  }

  return [...cards].sort((a, b) => {
    switch (sort) {
      case 'name':
        return mult * a.name.localeCompare(b.name)
      case 'cmc':
        return mult * (a.cmc - b.cmc)
      case 'usd': {
        const pa = parseFloat(a.prices.usd ?? '0') || 0
        const pb = parseFloat(b.prices.usd ?? '0') || 0
        return mult * (pa - pb)
      }
      case 'released':
        return (
          mult *
          ((a.released_at ?? '').localeCompare(b.released_at ?? ''))
        )
      case 'edhrec': {
        const ra = a.edhrec_rank ?? 999999
        const rb = b.edhrec_rank ?? 999999
        return mult * (ra - rb)
      }
      default:
        return 0
    }
  })
}
