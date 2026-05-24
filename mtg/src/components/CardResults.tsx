import type { CardMatch } from '../types/card'
import { useCardDetail } from '../context/CardDetailContext'
import { usePopularity } from '../context/PopularityContext'
import { EdhrecBadge } from './EdhrecBadge'
import { popularityLabel } from '../lib/edhrec'
import { cardToDetail } from '../lib/card-insight'
import { keywordById } from '../lib/mtg-keywords'

type Props = {
  matches: CardMatch[]
  loading?: boolean
  emptyMessage?: string
}

export function CardResults({ matches, loading, emptyMessage }: Props) {
  const { openDetail } = useCardDetail()
  const { showPopularity } = usePopularity()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-mtg-muted)]">
        <span className="animate-pulse">Matching cards…</span>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--color-mtg-muted)]">
        {emptyMessage ?? 'No cards matched.'}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m) => {
        const img = m.card.image
        return (
          <button
            key={m.card.id}
            type="button"
            onClick={() => openDetail(cardToDetail(m.card))}
            className="group flex gap-3 rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-3 text-left transition hover:border-[var(--color-mtg-gold)]"
          >
            {img ? (
              <img
                src={img}
                alt={m.card.name}
                className="h-36 w-24 shrink-0 rounded object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded bg-[var(--color-mtg-bg)] p-1 text-center text-xs">
                {m.card.name}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{m.card.name}</p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.matchPercent > 0 && (
                    <span className="rounded bg-[var(--color-mtg-gold)]/20 px-2 py-0.5 text-xs text-[var(--color-mtg-gold)]">
                      {m.matchPercent}%
                    </span>
                  )}
                  <EdhrecBadge name={m.card.name} rank={m.card.edhrec_rank} />
                </div>
              </div>
              {showPopularity && m.card.edhrec_rank && (
                <p className="mt-0.5 text-[10px] text-emerald-400/80">
                  {popularityLabel(m.card.edhrec_rank)}
                </p>
              )}
              <p className="mt-0.5 text-xs text-[var(--color-mtg-muted)]">
                {m.card.type_line}
              </p>
              {m.matchedTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.matchedTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--color-mtg-border)] px-1.5 py-0.5 text-[10px] capitalize"
                      title={keywordById(t)?.meaning}
                    >
                      {(keywordById(t)?.name ?? t).replace('-', ' ')}
                    </span>
                  ))}
                </div>
              )}
              {m.reasons.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--color-mtg-muted)]">
                  {m.reasons.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 line-clamp-3 text-[11px] text-[var(--color-mtg-muted)]">
                {m.card.oracle_text.slice(0, 200)}
                {m.card.oracle_text.length > 200 ? '…' : ''}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
