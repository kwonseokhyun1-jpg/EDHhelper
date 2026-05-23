import type { CommanderPairMatch } from '../types/commander'
import { useCardDetail } from '../context/CardDetailContext'
import { usePopularity } from '../context/PopularityContext'
import { EdhrecBadge } from './EdhrecBadge'
import { popularityLabel } from '../lib/edhrec'
import { commanderToDetail } from '../lib/card-insight'

type Props = {
  pairs: CommanderPairMatch[]
  loading?: boolean
  emptyMessage?: string
}

export function CommanderPairResults({ pairs, loading, emptyMessage }: Props) {
  const { openDetail } = useCardDetail()
  const { showPopularity } = usePopularity()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-mtg-muted)]">
        <span className="animate-pulse">Matching commander pairs…</span>
      </div>
    )
  }

  if (pairs.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--color-mtg-muted)]">
        {emptyMessage ?? 'No commander pairs matched.'}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {pairs.map((p) => (
        <div
          key={`${p.primary.id}-${p.partner.id}`}
          className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full border border-[var(--color-mtg-border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-mtg-muted)]">
              {p.pairType}
            </span>
            {p.matchPercent > 0 && (
              <span className="rounded bg-[var(--color-mtg-gold)]/20 px-2 py-0.5 text-xs text-[var(--color-mtg-gold)]">
                {p.matchPercent}% match
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[p.primary, p.partner].map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => openDetail(commanderToDetail(cmd))}
                className="flex gap-3 rounded-lg border border-[var(--color-mtg-border)] p-2 text-left transition hover:border-[var(--color-mtg-gold)]"
              >
                {cmd.image ? (
                  <img
                    src={cmd.image}
                    alt={cmd.name}
                    className="h-28 w-20 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded bg-[var(--color-mtg-bg)] p-1 text-center text-[10px]">
                    {cmd.name}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{cmd.name}</p>
                    <EdhrecBadge name={cmd.name} rank={cmd.edhrec_rank} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--color-mtg-muted)]">
                    {cmd.color_identity.join('') || 'C'} · {cmd.type_line}
                  </p>
                  {showPopularity && cmd.edhrec_rank && (
                    <p className="mt-0.5 text-[10px] text-emerald-400/80">
                      {popularityLabel(cmd.edhrec_rank)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {p.matchedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {p.matchedTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--color-mtg-border)] px-1.5 py-0.5 text-[10px] capitalize"
                >
                  {t.replace('-', ' ')}
                </span>
              ))}
            </div>
          )}

          {p.reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--color-mtg-muted)]">
              {p.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
