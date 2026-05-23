import type { ScryfallCard } from '../types/mtg'
import { cardImage } from '../api/scryfall'

type Props = {
  cards: ScryfallCard[]
  scores?: Map<string, number>
  loading?: boolean
  emptyMessage?: string
  onCardClick?: (card: ScryfallCard) => void
}

export function CardGrid({
  cards,
  scores,
  loading,
  emptyMessage = 'No cards found.',
  onCardClick,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-mtg-muted)]">
        <span className="animate-pulse">Matching cards…</span>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--color-mtg-muted)]">{emptyMessage}</p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((card) => {
        const img = cardImage(card)
        const score = scores?.get(card.id)
        const price = card.prices.usd

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onCardClick?.(card)}
            className="group relative overflow-hidden rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] text-left transition hover:border-[var(--color-mtg-gold)] hover:shadow-lg hover:shadow-black/40"
          >
            {img ? (
              <img
                src={img}
                alt={card.name}
                className="aspect-[488/680] w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[488/680] items-center justify-center p-2 text-center text-xs">
                {card.name}
              </div>
            )}
            {score != null && score > 0 && (
              <span className="absolute right-1 top-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-mtg-gold)]">
                {score}%
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
              <p className="truncate text-xs font-semibold">{card.name}</p>
              <p className="text-[10px] text-[var(--color-mtg-muted)]">
                {price ? `$${price}` : '—'}
                {score != null && score > 0 && (
                  <span className="ml-1 text-[var(--color-mtg-gold)]">
                    · {Math.round(score)}% match
                  </span>
                )}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
