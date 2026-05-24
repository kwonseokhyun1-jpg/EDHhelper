import type { DeckDraft, SavedDeck } from '../types/deck'

const STORAGE_KEY = 'mtg_saved_decks'

function extractCommanderName(listText: string): string | null {
  const lines = listText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return null
  const last = lines[lines.length - 1]
  const match = last.match(/^(\d+)x?\s+(.+)$/i)
  return match ? match[2].trim() : last
}

function newId(): string {
  return crypto.randomUUID()
}

function readAll(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedDeck[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(decks: SavedDeck[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
}

export function fetchDecks(): SavedDeck[] {
  return readAll().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

export function createDeck(draft: DeckDraft): SavedDeck {
  const now = new Date().toISOString()
  const deck: SavedDeck = {
    id: newId(),
    name: draft.name.trim() || 'Untitled deck',
    list_text: draft.list_text,
    commander_name: extractCommanderName(draft.list_text),
    created_at: now,
    updated_at: now,
  }
  writeAll([deck, ...readAll()])
  return deck
}

export function updateDeck(id: string, draft: DeckDraft): SavedDeck {
  const decks = readAll()
  const index = decks.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Deck not found.')

  const existing = decks[index]
  const updated: SavedDeck = {
    ...existing,
    name: draft.name.trim() || 'Untitled deck',
    list_text: draft.list_text,
    commander_name: extractCommanderName(draft.list_text),
    updated_at: new Date().toISOString(),
  }
  decks[index] = updated
  writeAll(decks)
  return updated
}

export function deleteDeck(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id))
}
