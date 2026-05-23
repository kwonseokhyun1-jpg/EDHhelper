import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

type Props = {
  onLoadDeck?: (text: string) => void
}

export function AccountPanel({ onLoadDeck }: Props) {
  const {
    username,
    user,
    savedDecklists,
    decksLoading,
    deleteDecklist,
    signOut,
  } = useAuth()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-[var(--color-mtg-border)] px-3 py-2 text-sm text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)] hover:text-white"
      >
        Account
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[var(--color-mtg-border)] pb-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-10 w-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-mtg-bg)] text-sm font-semibold">
                {(username ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{username}</p>
              <p className="truncate text-xs text-[var(--color-mtg-muted)]">{user?.email}</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mtg-muted)]">
              Saved decklists
            </p>
            {decksLoading ? (
              <p className="mt-2 text-sm text-[var(--color-mtg-muted)] animate-pulse">Loading…</p>
            ) : savedDecklists.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-mtg-muted)]">No saved decks yet.</p>
            ) : (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {savedDecklists.map((deck) => (
                  <li
                    key={deck.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-mtg-border)] px-2 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoadDeck?.(deck.text)
                        setOpen(false)
                      }}
                      className="min-w-0 flex-1 text-left text-sm hover:text-[var(--color-mtg-gold)]"
                    >
                      <span className="block truncate font-medium">{deck.name}</span>
                      {deck.commanderName && (
                        <span className="block truncate text-[10px] text-[var(--color-mtg-muted)]">
                          {deck.commanderName}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        deleteDecklist(deck.id).catch((e) =>
                          alert(e instanceof Error ? e.message : 'Delete failed'),
                        )
                      }
                      className="shrink-0 text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              signOut()
              setOpen(false)
            }}
            className="mt-4 w-full rounded-lg border border-[var(--color-mtg-border)] px-3 py-2 text-sm text-[var(--color-mtg-muted)] hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
