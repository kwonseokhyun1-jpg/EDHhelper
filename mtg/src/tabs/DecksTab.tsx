import { useCallback, useEffect, useState } from 'react'
import { DeckEditor } from '../components/DeckEditor'
import { useAuth } from '../context/AuthContext'
import {
  createDeck,
  deleteDeck,
  fetchDecks,
  updateDeck,
} from '../lib/decks-api'
import type { SavedDeck } from '../types/deck'

type View = 'list' | 'editor'

export function DecksTab() {
  const { user, apiAvailable } = useAuth()
  const [view, setView] = useState<View>('list')
  const [decks, setDecks] = useState<SavedDeck[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deckName, setDeckName] = useState('')
  const [listText, setListText] = useState('')

  const refreshDecks = useCallback(async () => {
    if (!user) {
      setDecks([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setDecks(await fetchDecks())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load decks')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refreshDecks()
  }, [refreshDecks])

  const openNew = () => {
    setEditingId(null)
    setDeckName('')
    setListText('')
    setView('editor')
  }

  const openDeck = (deck: SavedDeck) => {
    setEditingId(deck.id)
    setDeckName(deck.name)
    setListText(deck.list_text)
    setView('editor')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deck?')) return
    setError(null)
    try {
      await deleteDeck(id)
      setDecks((prev) => prev.filter((d) => d.id !== id))
      if (editingId === id) {
        setView('list')
        setEditingId(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete deck')
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const updated = await updateDeck(editingId, { name: deckName, list_text: listText })
        setDecks((prev) => [updated, ...prev.filter((d) => d.id !== updated.id)])
      } else {
        const created = await createDeck({ name: deckName, list_text: listText })
        setEditingId(created.id)
        setDecks((prev) => [created, ...prev])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save deck')
    } finally {
      setSaving(false)
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
        onSave={user ? handleSave : undefined}
        saving={saving}
        saveLabel={editingId ? 'Save changes' : 'Save deck'}
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
              {user
                ? 'Your saved decklists. Open one to analyze, playtest, or upgrade.'
                : 'Sign in to save decks. You can still build and analyze a list without an account.'}
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

        {!apiAvailable && (
          <p className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            Cloud save needs the API server — run <code className="text-amber-100">npm run dev</code>.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      {user && (
        <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
          {loading ? (
            <p className="text-sm text-[var(--color-mtg-muted)] animate-pulse">Loading decks…</p>
          ) : decks.length === 0 ? (
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
      )}
    </div>
  )
}
