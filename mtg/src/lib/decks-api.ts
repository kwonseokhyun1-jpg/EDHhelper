import { apiFetch } from './api-client'
import type { DeckDraft, SavedDeck } from '../types/deck'

export { checkApiAvailable as isDeckStorageAvailable } from './api-client'
export { getStoredToken } from './api-client'

export function decksAvailable(): boolean {
  return true
}

export async function fetchDecks(): Promise<SavedDeck[]> {
  const data = await apiFetch<{ decks: SavedDeck[] }>('/decks')
  return data.decks
}

export async function createDeck(draft: DeckDraft): Promise<SavedDeck> {
  const data = await apiFetch<{ deck: SavedDeck }>('/decks', {
    method: 'POST',
    body: JSON.stringify({ name: draft.name, list_text: draft.list_text }),
  })
  return data.deck
}

export async function updateDeck(id: string, draft: DeckDraft): Promise<SavedDeck> {
  const data = await apiFetch<{ deck: SavedDeck }>(`/decks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: draft.name, list_text: draft.list_text }),
  })
  return data.deck
}

export async function deleteDeck(id: string): Promise<void> {
  await apiFetch<void>(`/decks/${id}`, { method: 'DELETE' })
}
