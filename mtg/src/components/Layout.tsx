import type { ReactNode } from 'react'
import { AccountPanel } from './AccountPanel'

export type TabId =
  | 'commander'
  | 'cards'
  | 'deck'
  | 'finance'
  | 'judge'

const TABS: { id: TabId; label: string }[] = [
  { id: 'commander', label: 'Find Commander' },
  { id: 'cards', label: 'Find Cards' },
  { id: 'deck', label: 'Decklist' },
  { id: 'finance', label: 'Finance' },
  { id: 'judge', label: 'Judge' },
]

type Props = {
  active: TabId
  onTabChange: (tab: TabId) => void
  onLoadDeck?: (text: string) => void
  children: ReactNode
}

export function Layout({ active, onTabChange, onLoadDeck, children }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-8 pt-6">
      <header className="mb-6 border-b border-[var(--color-mtg-border)] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wide text-[var(--color-mtg-gold)] sm:text-3xl"
            >
              Commander Helper
            </h1>
            <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
              Commander deck tools
            </p>
          </div>
          <AccountPanel onLoadDeck={onLoadDeck} />
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active === tab.id
                  ? 'bg-[var(--color-mtg-gold)] text-black'
                  : 'border border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
