import type { CardRecord } from '../types/card'
import type { DeckAnalysis } from '../types/mtg'
import { getCardByNameLocal, loadCardDatabase } from './card-db'

type GameChangerList = {
  updated_at: string
  count: number
  names: string[]
}

let cachedNames: Set<string> | null = null

async function loadGameChangerNames(): Promise<Set<string>> {
  if (cachedNames) return cachedNames

  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/game-changers.json`)
    if (res.ok) {
      const data = (await res.json()) as GameChangerList
      cachedNames = new Set(data.names.map((n) => n.toLowerCase()))
      return cachedNames
    }
  } catch {
    /* fall through */
  }

  cachedNames = new Set()
  return cachedNames
}

export function isGameChangerCard(
  card: CardRecord,
  gameChangerNames: Set<string>,
): boolean {
  if (card.game_changer === true) return true
  return gameChangerNames.has(card.name.toLowerCase())
}

export async function findGameChangersInDeck(
  analysis: DeckAnalysis,
): Promise<CardRecord[]> {
  await loadCardDatabase()
  const gameChangerNames = await loadGameChangerNames()
  const seen = new Set<string>()
  const found: CardRecord[] = []

  const entries = [
    ...analysis.cards,
    ...(analysis.commander ? [analysis.commander] : []),
  ]

  for (const entry of entries) {
    const record = getCardByNameLocal(entry.name)
    if (!record) continue
    const key = record.name.toLowerCase()
    if (seen.has(key)) continue
    if (!isGameChangerCard(record, gameChangerNames)) continue
    seen.add(key)
    found.push(record)
  }

  found.sort((a, b) => a.name.localeCompare(b.name))
  return found
}
