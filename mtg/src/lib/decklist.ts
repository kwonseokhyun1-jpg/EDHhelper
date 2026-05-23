import type { DeckAnalysis, DeckCard, ManaColor, ScryfallCard } from '../types/mtg'
import { MANA_COLORS } from '../types/mtg'
import {
  cardRecordToScryfall,
  getCardByNameLocal,
  isCommanderCard,
  loadCardDatabase,
} from './card-db'

const BASIC_LANDS = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
  'snow-covered mountain', 'snow-covered forest',
  'wastes',
])

export function parseDecklist(text: string): DeckCard[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const cards: DeckCard[] = []

  for (const line of lines) {
    const match = line.match(/^(\d+)x?\s+(.+)$/i) ?? line.match(/^(.+)$/)
    if (!match) continue

    if (match.length === 3) {
      cards.push({ quantity: parseInt(match[1], 10), name: match[2].trim() })
    } else {
      cards.push({ quantity: 1, name: (match[1] ?? match[0]).trim() })
    }
  }

  return cards
}

function colorIdentityFromCards(cards: ScryfallCard[]): ManaColor[] {
  const set = new Set<ManaColor>()
  for (const card of cards) {
    for (const c of card.color_identity ?? []) {
      if (MANA_COLORS.includes(c as ManaColor)) set.add(c as ManaColor)
    }
  }
  return MANA_COLORS.filter((c) => set.has(c))
}

export async function analyzeDecklist(text: string): Promise<DeckAnalysis> {
  await loadCardDatabase()

  const parsed = parseDecklist(text)

  if (parsed.length === 0) {
    return {
      cards: [],
      totalCards: 0,
      uniqueCards: 0,
      colorIdentity: [],
      avgCmc: 0,
      totalUsd: 0,
      issues: ['Decklist is empty.'],
      warnings: [],
    }
  }

  const commanderEntry = parsed[parsed.length - 1]
  const maindeckEntries = parsed.slice(0, -1)

  const resolveEntry = (entry: DeckCard): DeckCard => {
    const found = getCardByNameLocal(entry.name)
    if (!found) return { ...entry, error: 'Card not found in local database' }
    return { ...entry, card: cardRecordToScryfall(found) }
  }

  const commanderResolved = resolveEntry({ quantity: 1, name: commanderEntry.name })
  const commander: DeckCard = { ...commanderResolved, quantity: 1 }
  const cards: DeckCard[] = maindeckEntries.map(resolveEntry)

  const resolved = cards.filter((c): c is DeckCard & { card: ScryfallCard } => !!c.card)
  const maindeckCount = cards.reduce((s, c) => s + c.quantity, 0)
  const totalCards = maindeckCount + 1

  const identityCards = commander.card
    ? [commander.card, ...resolved.map((c) => c.card)]
    : resolved.map((c) => c.card)

  const colorIdentity = colorIdentityFromCards(identityCards)
  const nonLand = resolved.filter((c) => !c.card.type_line?.toLowerCase().includes('land'))
  const avgCmc =
    nonLand.length > 0
      ? nonLand.reduce((s, c) => s + c.card.cmc * c.quantity, 0) /
        nonLand.reduce((s, c) => s + c.quantity, 0)
      : 0

  let totalUsd = 0
  for (const c of resolved) {
    const price = parseFloat(c.card.prices.usd ?? '0') || 0
    totalUsd += price * c.quantity
  }
  if (commander.card) {
    totalUsd += parseFloat(commander.card.prices.usd ?? '0') || 0
  }

  const issues: string[] = []
  const warnings: string[] = []

  if (parsed.length < 2) {
    issues.push('Add your 99-card maindeck, then put your commander as the last line.')
  }

  if (maindeckCount !== 99) {
    issues.push(`Maindeck has ${maindeckCount} cards (expected 99 before the commander line).`)
  }

  if (totalCards !== 100) {
    warnings.push(`List has ${totalCards} cards total including commander (expected 100).`)
  }

  const commanderKey = commander.name.toLowerCase()
  const commanderInMain = resolved.filter((c) => c.name.toLowerCase() === commanderKey)
  if (commanderInMain.length > 0) {
    warnings.push(
      `"${commander.name}" appears in the maindeck and as commander — it should only be listed last.`,
    )
  }

  const nonBasicDupes = new Map<string, number>()
  for (const c of resolved) {
    const key = c.name.toLowerCase()
    if (!BASIC_LANDS.has(key)) {
      nonBasicDupes.set(key, (nonBasicDupes.get(key) ?? 0) + c.quantity)
    }
  }
  for (const [name, qty] of nonBasicDupes) {
    if (qty > 1) issues.push(`"${name}" appears ${qty} times (Commander is singleton).`)
  }

  if (!commander.card) {
    issues.push(`Commander "${commander.name}" not found — check the last line of your list.`)
  } else {
    const local = getCardByNameLocal(commander.name)
    if (local && !isCommanderCard(local)) {
      warnings.push(`"${commander.name}" (last line) may not be a valid commander.`)
    }
  }

  for (const c of resolved) {
    if (!c.card) continue
    const cardColors = new Set(c.card.color_identity ?? [])
    const identity = new Set(colorIdentity)
    for (const col of cardColors) {
      if (col && !identity.has(col as ManaColor)) {
        issues.push(`"${c.name}" is outside commander color identity.`)
        break
      }
    }
  }

  return {
    commander,
    cards,
    totalCards,
    uniqueCards: new Set(parsed.map((c) => c.name)).size,
    colorIdentity,
    avgCmc,
    totalUsd,
    issues,
    warnings,
  }
}
