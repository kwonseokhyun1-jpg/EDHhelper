import type { CardDatabase, CardPrinting, CardRecord } from '../types/card'
import type { ScryfallCard } from '../types/mtg'

import { canonicalCardName, canonicalNameKey } from './card-names'
import { fetchJsonAsset } from './assets'
import { initCardNameIndex } from './card-name-resolve'

let cache: CardDatabase | null = null
let nameIndex: Map<string, CardRecord> | null = null

function parsePriceUsd(usd?: string | null): number | null {
  if (!usd) return null
  const n = parseFloat(usd)
  return Number.isFinite(n) ? n : null
}

/** Cheapest printing with a USD price; falls back to first printing with art. */
export function cheapestPrinting(card: CardRecord): CardPrinting | undefined {
  const printings = card.printings ?? []
  if (printings.length === 0) return undefined

  let best: CardPrinting | undefined
  let bestPrice = Infinity

  for (const p of printings) {
    const price = parsePriceUsd(p.prices?.usd)
    if (price != null && price < bestPrice) {
      bestPrice = price
      best = p
    }
  }

  return best ?? printings.find((p) => p.image) ?? printings[0]
}

export function sortPrintingsByPrice(printings: CardPrinting[]): CardPrinting[] {
  return [...printings].sort((a, b) => {
    const pa = parsePriceUsd(a.prices?.usd) ?? Infinity
    const pb = parsePriceUsd(b.prices?.usd) ?? Infinity
    return pa - pb || a.set_name.localeCompare(b.set_name)
  })
}

/** Lowest USD price across the card record and all printings. */
export function bestCardPriceUsd(card: CardRecord): string | null {
  const printing = cheapestPrinting(card)
  if (printing?.prices?.usd) return printing.prices.usd

  const top = parsePriceUsd(card.prices?.usd)
  if (top != null) return card.prices!.usd!

  return null
}

function applyCheapestDisplay(card: CardRecord): CardRecord {
  const sorted = card.printings?.length
    ? sortPrintingsByPrice(card.printings)
    : card.printings

  const display = cheapestPrinting({ ...card, printings: sorted })
  if (!display) {
    return { ...card, printings: sorted }
  }

  return {
    ...card,
    id: display.id,
    image: display.image ?? card.image,
    scryfall_uri: display.scryfall_uri ?? card.scryfall_uri,
    prices: display.prices?.usd ? display.prices : card.prices,
    printings: sorted,
  }
}

function mergePrintings(a: CardPrinting[], b: CardPrinting[]): CardPrinting[] {
  const seen = new Set<string>()
  const out: CardPrinting[] = []
  for (const p of [...a, ...b]) {
    const key = `${p.set}:${p.collector_number}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

function mergeCardRecords(a: CardRecord, b: CardRecord): CardRecord {
  const rankA = a.edhrec_rank ?? 999999
  const rankB = b.edhrec_rank ?? 999999
  const primary = rankA <= rankB ? a : b
  const secondary = primary === a ? b : a
  const ranks = [a.edhrec_rank, b.edhrec_rank].filter(
    (r): r is number => r != null && r > 0,
  )
  return {
    ...primary,
    name: canonicalCardName(primary.name),
    edhrec_rank: ranks.length ? Math.min(...ranks) : primary.edhrec_rank,
    printings: mergePrintings(primary.printings ?? [], secondary.printings ?? []),
    game_changer: primary.game_changer || secondary.game_changer,
  }
}

function dedupeCardsByCanonicalName(cards: CardRecord[]): CardRecord[] {
  const byKey = new Map<string, CardRecord>()
  for (const card of cards) {
    const key = canonicalNameKey(card.name)
    const normalized = { ...card, name: canonicalCardName(card.name) }
    const existing = byKey.get(key)
    byKey.set(key, existing ? mergeCardRecords(existing, normalized) : normalized)
  }
  return [...byKey.values()]
}

function normalizeCardRecord(card: CardRecord): CardRecord {
  const base: CardRecord = {
    ...card,
    roles: Array.isArray(card.roles) ? card.roles : [],
    tags: Array.isArray(card.tags) ? card.tags : [],
    keywords: Array.isArray(card.keywords) ? card.keywords : [],
  }
  return applyCheapestDisplay(base)
}

export async function loadCardDatabase(): Promise<CardDatabase> {
  if (cache) return cache

  const raw = await fetchJsonAsset<CardDatabase>('data/cards.json', 'Card database')
  const cards = dedupeCardsByCanonicalName(raw.cards.map(normalizeCardRecord))
  cache = { ...raw, cards, count: cards.length }
  nameIndex = new Map(cards.map((c) => [canonicalNameKey(c.name), c]))
  initCardNameIndex(cards)
  return cache
}

export function getCardByNameLocal(name: string): CardRecord | undefined {
  if (!nameIndex) return undefined
  const key = canonicalNameKey(name)
  return nameIndex.get(key) ?? nameIndex.get(name.toLowerCase())
}

export function formatCardPrice(card: CardRecord): string {
  const usd = bestCardPriceUsd(card)
  return usd ? `$${usd}` : '—'
}

export function cardRecordToScryfall(
  c: CardRecord,
  printing?: CardPrinting,
): ScryfallCard {
  const chosen = printing ?? cheapestPrinting(c)
  const image = chosen?.image ?? c.image
  const usd = chosen?.prices?.usd ?? bestCardPriceUsd(c)
  return {
    id: chosen?.id ?? c.id,
    name: c.name,
    type_line: c.type_line,
    oracle_text: c.oracle_text,
    mana_cost: c.mana_cost,
    cmc: c.cmc,
    color_identity: c.color_identity,
    keywords: c.keywords,
    image_uris: image ? { normal: image, small: image } : undefined,
    prices: { usd: usd ?? null },
    legalities: { commander: 'legal' },
    scryfall_uri: chosen?.scryfall_uri ?? c.scryfall_uri,
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
