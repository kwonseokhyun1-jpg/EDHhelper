import type { CardRecord } from '../types/card'

export type PriceSnapshot = {
  date: string
  usd: number
}

type TcgplayerHistoryDay = {
  date: string
  variants?: Array<{
    variant?: string
    marketPrice?: string | number
    averageSalesPrice?: string | number
  }>
}

type TcgplayerHistoryResponse = {
  count?: number
  result?: TcgplayerHistoryDay[]
}

const SCRYFALL = 'https://api.scryfall.com'
const HISTORY_DAYS = 180

function tcgplayerApiBase(): string {
  const externalBase = import.meta.env.VITE_TCGPLAYER_API_BASE as string | undefined
  if (externalBase?.trim()) {
    return `${externalBase.trim().replace(/\/$/, '')}/api/tcgplayer`
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/tcgplayer`
}

async function fetchScryfallCard(scryfallId: string): Promise<{ tcgplayer_id?: number | null } | null> {
  try {
    const res = await fetch(`${SCRYFALL}/cards/${scryfallId}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as { tcgplayer_id?: number | null }
  } catch {
    return null
  }
}

/** Resolve a TCGPlayer product id for the card's cheapest display printing. */
export async function resolveTcgplayerProductId(card: CardRecord): Promise<number | null> {
  const idsToTry = [
    card.id,
    ...(card.printings?.map((p) => p.id) ?? []),
  ]

  for (const id of idsToTry) {
    const data = await fetchScryfallCard(id)
    if (data?.tcgplayer_id) return data.tcgplayer_id
  }

  try {
    const res = await fetch(
      `${SCRYFALL}/cards/named?exact=${encodeURIComponent(card.name)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (res.ok) {
      const named = (await res.json()) as { tcgplayer_id?: number | null }
      if (named.tcgplayer_id) return named.tcgplayer_id
    }
  } catch {
    /* ignore */
  }

  return null
}

function parseMarketPrice(day: TcgplayerHistoryDay): number | null {
  const variants = day.variants ?? []
  const normal = variants.find((v) => v.variant === 'Normal') ?? variants[0]
  if (!normal) return null

  const raw = normal.marketPrice ?? normal.averageSalesPrice
  const price = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  return Number.isFinite(price) && price > 0 ? price : null
}

/** TCGPlayer market price history (~6 months / 180 days). */
export async function fetchTcgplayerPriceHistory(
  productId: number,
  days = HISTORY_DAYS,
): Promise<PriceSnapshot[]> {
  const url = `${tcgplayerApiBase()}/price/history/${productId}?range=${days}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const body = await res.text()

  if (!res.ok) {
    throw new Error(`TCGPlayer price history unavailable (${res.status})`)
  }

  let data: TcgplayerHistoryResponse
  try {
    data = JSON.parse(body) as TcgplayerHistoryResponse
  } catch {
    throw new Error(
      'TCGPlayer price history proxy returned invalid data. Redeploy with the latest Vercel API routes, or run `npm run dev` locally.',
    )
  }
  const points: PriceSnapshot[] = []

  for (const day of data.result ?? []) {
    const usd = parseMarketPrice(day)
    if (usd != null) points.push({ date: day.date, usd })
  }

  points.sort((a, b) => a.date.localeCompare(b.date))
  return points
}

export function tcgplayerProductUrl(productId: number): string {
  return `https://www.tcgplayer.com/product/${productId}`
}

export const TCGPLAYER_HISTORY_DAYS = HISTORY_DAYS
