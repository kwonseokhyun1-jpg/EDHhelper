import type { ColorFilter, ScryfallCard, ScryfallSearchResponse } from '../types/mtg'
import { sortIdentity } from '../lib/color-filter'

const BASE = 'https://api.scryfall.com'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { details?: string }).details ?? `Scryfall error ${res.status}`,
    )
  }
  return res.json() as Promise<T>
}

export function cardImage(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.image_uris?.art_crop
  )
}

export function cardOracleText(card: ScryfallCard): string {
  if (card.oracle_text) return card.oracle_text
  return card.card_faces?.map((f) => f.oracle_text ?? '').join('\n') ?? ''
}

export function isCommander(card: ScryfallCard): boolean {
  const text = cardOracleText(card).toLowerCase()
  return (
    text.includes('can be your commander') ||
    (card.type_line?.includes('Legendary') &&
      (card.type_line.includes('Creature') ||
        card.type_line.includes('Planeswalker') ||
        card.type_line.includes('Background')))
  )
}

export async function searchCards(
  query: string,
  options?: {
    order?: string
    dir?: 'asc' | 'desc'
    unique?: 'cards' | 'art' | 'prints'
  },
): Promise<ScryfallSearchResponse> {
  const params = new URLSearchParams({ q: query })
  if (options?.order) params.set('order', options.order)
  if (options?.dir) params.set('dir', options.dir)
  if (options?.unique) params.set('unique', options.unique)
  return fetchJson(`${BASE}/cards/search?${params}`)
}

export async function searchAllPages(
  query: string,
  maxCards = 175,
): Promise<ScryfallCard[]> {
  let url: string | null = `${BASE}/cards/search?q=${encodeURIComponent(query)}`
  const cards: ScryfallCard[] = []

  while (url && cards.length < maxCards) {
    const page: ScryfallSearchResponse = await fetchJson(url)
    cards.push(...page.data)
    if (!page.has_more || cards.length >= maxCards) break
    url = page.next_page ?? null
  }

  return cards.slice(0, maxCards)
}

export async function getCardByName(name: string): Promise<ScryfallCard> {
  const params = new URLSearchParams({ exact: name, fuzzy: '' })
  return fetchJson(`${BASE}/cards/named?${params}`)
}

export async function getCardByNameFuzzy(name: string): Promise<ScryfallCard | null> {
  try {
    const params = new URLSearchParams({ fuzzy: name })
    return await fetchJson(`${BASE}/cards/named?${params}`)
  } catch {
    return null
  }
}

export async function getCardsByNames(
  names: string[],
): Promise<Map<string, ScryfallCard | { error: string }>> {
  if (names.length === 0) return new Map()

  const map = new Map<string, ScryfallCard | { error: string }>()
  const chunkSize = 75

  for (let i = 0; i < names.length; i += chunkSize) {
    const chunk = names.slice(i, i + chunkSize)
    const identifiers = chunk.map((name) => ({ name }))
    const res = await fetch(`${BASE}/cards/collection`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifiers }),
    })

    const body = (await res.json()) as {
      data?: ScryfallCard[]
      not_found?: Array<{ name: string }>
    }

    for (const card of body.data ?? []) {
      map.set(card.name.toLowerCase(), card)
    }
    for (const missing of body.not_found ?? []) {
      map.set(missing.name.toLowerCase(), { error: 'Card not found' })
    }
  }

  return map
}

export function colorQueryFromFilter(filter: ColorFilter): string {
  if (filter.colorlessOnly) return ' id:c'
  if (filter.colors.length === 0) return ''
  const id = sortIdentity(filter.colors).join('')
  // id:uw id<=uw = exactly Azorius (not mono, not three-color)
  return ` id:${id} id<=${id}`
}

export function buildCardSearch(prompt: string, filter: ColorFilter): string {
  const parts: string[] = ['-is:token', 'game:paper']
  const colorPart = colorQueryFromFilter(filter)
  if (colorPart) parts.push(colorPart)

  const trimmed = prompt.trim()
  if (trimmed) {
    if (/^[\w:\s<>=+\-/"'(),]+$/.test(trimmed) && trimmed.includes(':')) {
      parts.push(`(${trimmed})`)
    } else {
      const terms = trimmed
        .split(/\s+/)
        .filter((t) => t.length > 1)
        .slice(0, 8)
      if (terms.length > 0) {
        parts.push(`(${terms.map((t) => `o:${t}`).join(' ')})`)
      }
    }
  } else {
    parts.push('f:commander')
  }

  return parts.join(' ')
}

export async function getPriceSpikeCandidates(): Promise<ScryfallCard[]> {
  const query =
    'f:commander usd>5 order:usd dir=desc unique:cards'
  const res = await searchCards(query, { order: 'usd', dir: 'desc', unique: 'cards' })
  return res.data.slice(0, 24)
}
