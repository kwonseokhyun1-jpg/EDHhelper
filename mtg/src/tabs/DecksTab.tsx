import { useCallback, useEffect, useState } from 'react'
import { DeckEditor } from '../components/DeckEditor'
import {
  createDeck,
  deleteDeck,
  fetchDecks,
  updateDeck,
} from '../lib/decks-storage'
import type { SavedDeck } from '../types/deck'

type View = 'list' | 'editor'

export function DecksTab() {
  const [view, setView] = useState<View>('list')
  const [decks, setDecks] = useState<SavedDeck[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deckName, setDeckName] = useState('')
  const [listText, setListText] = useState('')

  const refreshDecks = useCallback(() => {
    setDecks(fetchDecks())
  }, [])

  useEffect(() => {
    refreshDecks()
  }, [refreshDecks])

  useEffect(() => {
    if (view !== 'editor') return
    if (!deckName.trim() && !listText.trim()) return

    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        if (editingId) {
          updateDeck(editingId, { name: deckName, list_text: listText })
        } else {
          const created = createDeck({ name: deckName, list_text: listText })
          setEditingId(created.id)
        }
        refreshDecks()
        setSaveState('saved')
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save deck')
        setSaveState('idle')
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [view, editingId, deckName, listText, refreshDecks])

  const openNew = () => {
    setEditingId(null)
    setDeckName('')
    setListText('')
    setSaveState('idle')
    setView('editor')
  }

  const openDeck = (deck: SavedDeck) => {
    setEditingId(deck.id)
    setDeckName(deck.name)
    setListText(deck.list_text)
    setSaveState('saved')
    setView('editor')
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this deck?')) return
    setError(null)
    try {
      deleteDeck(id)
      setDecks((prev) => prev.filter((d) => d.id !== id))
      if (editingId === id) {
        setView('list')
        setEditingId(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete deck')
    }
  }

  if (view === 'editor') {
    return (
      <DeckEditor
        deckName={deckName}
        onDeckNameChange={setDeckName}
        initialText={listText}
        onTextChange={setListText}
        onBack={() => setView('list')}
        saveStatus={
          saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved in browser' : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
              Decks
            </h2>
            <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
              Decklists save automatically in this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="shrink-0 rounded-lg bg-[var(--color-mtg-gold)] px-4 py-2 text-sm font-semibold text-black"
          >
            + Add new deck
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        {decks.length === 0 ? (
          <p className="text-sm text-[var(--color-mtg-muted)]">
            No saved decks yet. Click &quot;+ Add new deck&quot; to create one.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-mtg-border)]">
            {decks.map((deck) => (
              <li key={deck.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => openDeck(deck)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium text-white">{deck.name}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-mtg-muted)]">
                    {deck.commander_name ? `${deck.commander_name} · ` : ''}
                    Updated {new Date(deck.updated_at).toLocaleDateString()}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deck.id)}
                  className="rounded-lg border border-red-800/50 px-3 py-1.5 text-xs text-red-400 hover:border-red-500 hover:text-red-300"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
