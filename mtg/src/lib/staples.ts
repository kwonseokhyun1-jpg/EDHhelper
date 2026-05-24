import type { CardRecord } from '../types/card'
import type { ManaColor } from '../types/mtg'
import { MANA_COLORS } from '../types/mtg'

export type StapleColor = ManaColor | 'C'

export type StapleSort = 'popularity' | 'price-desc' | 'price-asc' | 'name' | 'cmc'

/** Max popularity rank to count as a commonly played staple */
export const STAPLE_MAX_RANK = 2500

function isLand(card: CardRecord): boolean {
  return /\bLand\b/.test(card.type_line)
}

/** Colorless artifacts and mana rocks (signets/talismans) — not mono-color staples. */
function isColorlessStapleArtifact(card: CardRecord): boolean {
  if (!/\bArtifact\b/.test(card.type_line)) return false
  if (card.color_identity.length === 0) return true
  return /\b(signet|talisman)\b/i.test(card.name)
}

/** Commander staples: non-lands with strong popularity rank (from Scryfall data) */
export function getStaplesForColor(
  cards: CardRecord[],
  color: StapleColor,
): CardRecord[] {
  return cards.filter((c) => {
    if (isLand(c)) return false
    if (!c.edhrec_rank || c.edhrec_rank > STAPLE_MAX_RANK) return false

    const colorlessArtifact = isColorlessStapleArtifact(c)
    if (color === 'C') return colorlessArtifact
    if (colorlessArtifact) return false

    return c.color_identity.includes(color)
  })
}

export function sortStaples(cards: CardRecord[], sort: StapleSort): CardRecord[] {
  return [...cards].sort((a, b) => {
    switch (sort) {
      case 'popularity':
        return (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999)
      case 'price-desc': {
        const pa = parseFloat(a.prices?.usd ?? '0') || 0
        const pb = parseFloat(b.prices?.usd ?? '0') || 0
        return pb - pa
      }
      case 'price-asc': {
        const pa = parseFloat(a.prices?.usd ?? '0') || 0
        const pb = parseFloat(b.prices?.usd ?? '0') || 0
        return pa - pb
      }
      case 'name':
        return a.name.localeCompare(b.name)
      case 'cmc':
        return a.cmc - b.cmc || a.name.localeCompare(b.name)
      default:
        return 0
    }
  })
}

export const STAPLE_COLORS: { id: StapleColor; label: string }[] = [
  ...MANA_COLORS.map((c) => ({ id: c as StapleColor, label: c })),
  { id: 'C', label: 'Colorless' },
]

export const STAPLE_SORT_OPTIONS: { value: StapleSort; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-desc', label: 'Price (high → low)' },
  { value: 'price-asc', label: 'Price (low → high)' },
  { value: 'name', label: 'Name (A → Z)' },
  { value: 'cmc', label: 'Mana value (low → high)' },
]
