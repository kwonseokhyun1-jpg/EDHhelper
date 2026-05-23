import type { CardDatabase, CardRecord } from '../types/card'
import type { ScryfallCard } from '../types/mtg'

let cache: CardDatabase | null = null
let nameIndex: Map<string, CardRecord> | null = null

export async function loadCardDatabase(): Promise<CardDatabase> {
  if (cache) return cache

  const res = await fetch(`${import.meta.env.BASE_URL}data/cards.json`)
  if (!res.ok) {
    throw new Error(
      'Card database not found. Run npm run build:cards to generate it.',
    )
  }

  cache = (await res.json()) as CardDatabase
  nameIndex = new Map(
    cache.cards.map((c) => [c.name.toLowerCase(), c]),
  )
  return cache
}

export function getCardByNameLocal(name: string): CardRecord | undefined {
  return nameIndex?.get(name.toLowerCase())
}

export function cardRecordToScryfall(c: CardRecord): ScryfallCard {
  return {
    id: c.id,
    name: c.name,
    type_line: c.type_line,
    oracle_text: c.oracle_text,
    mana_cost: c.mana_cost,
    cmc: c.cmc,
    color_identity: c.color_identity,
    keywords: c.keywords,
    image_uris: c.image ? { normal: c.image, small: c.image } : undefined,
    prices: { usd: c.prices?.usd ?? null },
    legalities: { commander: 'legal' },
    scryfall_uri: c.scryfall_uri,
    edhrec_rank: c.edhrec_rank,
  }
}

export function isCommanderCard(c: CardRecord): boolean {
  const text = c.oracle_text.toLowerCase()
  return (
    text.includes('can be your commander') ||
    (c.type_line.includes('Legendary') &&
      (c.type_line.includes('Creature') ||
        c.type_line.includes('Planeswalker') ||
        c.type_line.includes('Background')))
  )
}
