import type { CardRecord } from '../types/card'
import type { ColorFilter } from '../types/mtg'
import { fitsColorIdentity } from './color-filter'

export type CardFilters = {
  name: string
  types: string[]
  cmcMin?: number
  cmcMax?: number
  containsWords: string[]
}

export const CARD_TYPE_OPTIONS = [
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Planeswalker',
  'Land',
  'Battle',
  'Legendary',
  'Aura',
  'Equipment',
  'Tribal',
]

export const CONTAINS_WORD_SUGGESTIONS = [
  'draw',
  'destroy',
  'exile',
  'counter',
  'flying',
  'trample',
  'haste',
  'flash',
  'enter',
  'dies',
  'sacrifice',
  'token',
  'search',
  'library',
  'damage',
  'life',
  'tap',
  'untap',
  'return',
  'graveyard',
  'mill',
  'proliferate',
  'landfall',
]

function nameMatchScore(name: string, query: string): number {
  const lower = name.toLowerCase()
  if (lower === query) return 100
  if (lower.startsWith(query)) return 80
  if (lower.split(/\s+/).some((w) => w.startsWith(query))) return 65
  if (lower.includes(query)) return 40
  return 0
}

export function hasActiveFilters(filters: CardFilters): boolean {
  return (
    filters.name.trim().length > 0 ||
    filters.types.length > 0 ||
    filters.containsWords.length > 0 ||
    filters.cmcMin != null ||
    filters.cmcMax != null
  )
}

export function searchCardsFiltered(
  cards: CardRecord[],
  filters: CardFilters,
  colorFilter: ColorFilter,
  limit = 175,
): CardRecord[] {
  let results = cards.filter((c) => fitsColorIdentity(c.color_identity, colorFilter))

  const nameQ = filters.name.trim().toLowerCase()
  if (nameQ) {
    results = results.filter((c) => c.name.toLowerCase().includes(nameQ))
  }

  for (const t of filters.types) {
    const tl = t.toLowerCase()
    results = results.filter((c) => c.type_line.toLowerCase().includes(tl))
  }

  if (filters.cmcMin != null) {
    results = results.filter((c) => c.cmc >= filters.cmcMin!)
  }
  if (filters.cmcMax != null) {
    results = results.filter((c) => c.cmc <= filters.cmcMax!)
  }

  for (const word of filters.containsWords) {
    const w = word.toLowerCase()
    results = results.filter(
      (c) =>
        c.oracle_text.toLowerCase().includes(w) ||
        c.type_line.toLowerCase().includes(w) ||
        c.name.toLowerCase().includes(w),
    )
  }

  if (nameQ) {
    results.sort(
      (a, b) =>
        nameMatchScore(b.name, nameQ) - nameMatchScore(a.name, nameQ) ||
        (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999),
    )
  } else {
    results.sort(
      (a, b) => (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999),
    )
  }

  return results.slice(0, limit)
}

export function suggestTypes(query: string, limit = 10): string[] {
  if (query.length < 1) return CARD_TYPE_OPTIONS.slice(0, limit)
  const q = query.toLowerCase()
  return CARD_TYPE_OPTIONS.filter((t) => t.toLowerCase().includes(q)).slice(0, limit)
}

export function suggestContainsWords(query: string, limit = 10): string[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  return CONTAINS_WORD_SUGGESTIONS.filter((w) => w.includes(q)).slice(0, limit)
}

export function describeCardFilters(filters: CardFilters): string {
  const parts: string[] = []
  if (filters.name.trim()) parts.push(`Name: ${filters.name.trim()}`)
  if (filters.types.length) parts.push(`Type: ${filters.types.join(', ')}`)
  if (filters.cmcMin != null || filters.cmcMax != null) {
    if (filters.cmcMin != null && filters.cmcMax != null) {
      parts.push(`CMC ${filters.cmcMin}–${filters.cmcMax}`)
    } else if (filters.cmcMax != null) {
      parts.push(`CMC ≤ ${filters.cmcMax}`)
    } else {
      parts.push(`CMC ≥ ${filters.cmcMin}`)
    }
  }
  if (filters.containsWords.length) {
    parts.push(`Contains: ${filters.containsWords.join(', ')}`)
  }
  return parts.join(' · ')
}
