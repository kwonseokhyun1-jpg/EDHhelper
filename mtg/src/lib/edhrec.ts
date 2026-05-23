/**
 * EDHREC popularity helpers. Rank data comes from Scryfall (sourced from EDHREC).
 * Lower rank = more popular (#1 is most played).
 */

export type PopularityTier =
  | 'top'
  | 'very-popular'
  | 'popular'
  | 'played'
  | 'niche'
  | 'unranked'

export function formatPopularityRank(rank?: number): string | null {
  if (!rank || rank <= 0) return null
  return `#${rank.toLocaleString()}`
}

/** Alias for internal data field naming */
export const formatEdhrecRank = formatPopularityRank

export function popularityTier(rank?: number): PopularityTier {
  if (!rank || rank <= 0) return 'unranked'
  if (rank <= 100) return 'top'
  if (rank <= 500) return 'very-popular'
  if (rank <= 2000) return 'popular'
  if (rank <= 8000) return 'played'
  return 'niche'
}

const TIER_LABELS: Record<PopularityTier, string> = {
  top: 'Rank #1–100',
  'very-popular': 'Rank #101–500',
  popular: 'Rank #501–2,000',
  played: 'Rank #2,001–8,000',
  niche: 'Rank above #8,000',
  unranked: 'No popularity rank available',
}

export function popularityLabel(rank?: number): string {
  return TIER_LABELS[popularityTier(rank)]
}

/** Small score boost for well-known commanders/cards (tie-breaker, not primary sort). */
export function edhrecScoreBoost(rank?: number, maxBoost = 12): number {
  if (!rank || rank <= 0) return 0
  return Math.max(0, maxBoost - Math.log10(rank) * (maxBoost / 4))
}

export function commanderEdhrecUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://edhrec.com/commanders/${slug}`
}

export function cardEdhrecUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://edhrec.com/cards/${slug}`
}

export type CommanderSort = 'match' | 'popularity'

export const COMMANDER_SORT_OPTIONS: Array<{ value: CommanderSort; label: string }> = [
  { value: 'match', label: 'Best match' },
  { value: 'popularity', label: 'Popularity' },
]
