import type { UpgradeRecommendation } from '../types/card'
import { useCardDetail } from '../context/CardDetailContext'
import { cardToDetail } from '../lib/card-insight'

type Props = {
  upgrades: UpgradeRecommendation[]
  loading?: boolean
}

export function UpgradeSuggestions({ upgrades, loading }: Props) {
  const { openDetail } = useCardDetail()

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-mtg-muted)] animate-pulse">
        Analyzing deck against local card database…
      </p>
    )
  }

  if (upgrades.length === 0) {
    return (
      <p className="text-sm text-[var(--color-mtg-muted)]">
        No upgrade gaps detected, or card database still loading.
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {upgrades.map((u) => (
        <li
          key={u.roleId}
          className="rounded-lg border border-[var(--color-mtg-border)] p-4"
        >
          <p className="font-semibold text-[var(--color-mtg-gold)]">{u.role}</p>
          <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">{u.reason}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {u.cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => openDetail(cardToDetail(card))}
                className="flex gap-2 rounded border border-[var(--color-mtg-border)] p-2 text-left text-xs hover:border-[var(--color-mtg-gold)]"
              >
                {card.image ? (
                  <img
                    src={card.image}
                    alt=""
                    className="h-14 w-10 shrink-0 rounded object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate font-medium">{card.name}</p>
                  <p className="text-[var(--color-mtg-gold)]">
                    {card.prices?.usd ? `$${card.prices.usd}` : '—'}
                  </p>
                  <p className="text-[10px] text-[var(--color-mtg-muted)]">
                    CMC {card.cmc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
