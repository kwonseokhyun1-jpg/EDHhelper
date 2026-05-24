export type SavedDeck = {
  id: string
  name: string
  list_text: string
  commander_name: string | null
  created_at: string
  updated_at: string
}

export type DeckDraft = {
  id?: string
  name: string
  list_text: string
}
