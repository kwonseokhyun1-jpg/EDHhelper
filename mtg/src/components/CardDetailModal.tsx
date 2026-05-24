import { useEffect, useMemo, useState } from 'react'
import { usePopularity } from '../context/PopularityContext'
import { formatPopularityRank } from '../lib/edhrec'
import { generateInsight, type DetailItem } from '../lib/card-insight'
import type { CardPrinting } from '../types/card'

type Props = {
  item: DetailItem | null
  onClose: () => void
}

function printingLabel(p: CardPrinting): string {
  const price = p.prices?.usd ? ` — $${p.prices.usd}` : ''
  return `${p.set_name} (${p.set.toUpperCase()}) #${p.collector_number}${price}`
}

function defaultPrintingId(item: DetailItem): string {
  return item.printings?.[0]?.id ?? item.id
}

export function CardDetailModal({ item, onClose }: Props) {
  const { showPopularity } = usePopularity()
  const [selectedPrintingId, setSelectedPrintingId] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setSelectedPrintingId(defaultPrintingId(item))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  const sortedPrintings = useMemo(
    () => item?.printings ?? [],
    [item?.printings],
  )

  const selectedPrinting = useMemo(() => {
    if (!sortedPrintings.length) return undefined
    return (
      sortedPrintings.find((p) => p.id === selectedPrintingId) ??
      sortedPrintings[0]
    )
  }, [sortedPrintings, selectedPrintingId])

  if (!item) return null

  const insight = generateInsight(item)
  const popularityRank = showPopularity ? formatPopularityRank(item.edhrec_rank) : null
  const image = selectedPrinting?.image ?? item.image
  const price = selectedPrinting?.prices?.usd ?? item.prices?.usd
  const scryfallUri = selectedPrinting?.scryfall_uri ?? item.scryfall_uri
  const isCheapest =
    sortedPrintings.length > 0 && selectedPrinting?.id === sortedPrintings[0]?.id

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-mtg-border)] p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-mtg-muted)]">
              {item.kind === 'commander' ? 'Commander' : 'Card'}
            </p>
            <h2 id="card-detail-title" className="text-lg font-semibold text-white">
              {item.name}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-mtg-muted)]">
              {item.mana_cost && <span className="mr-2">{item.mana_cost}</span>}
              {item.type_line}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-mtg-border)] px-2 py-1 text-sm text-[var(--color-mtg-muted)] hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[8rem_1fr]">
          {image ? (
            <img
              src={image}
              alt={item.name}
              className="mx-auto w-full max-w-[8rem] rounded-lg object-cover sm:mx-0"
            />
          ) : (
            <div className="flex aspect-[488/680] max-w-[8rem] items-center justify-center rounded-lg bg-[var(--color-mtg-bg)] p-2 text-center text-xs">
              {item.name}
            </div>
          )}

          <div className="space-y-4 text-sm">
            {sortedPrintings.length > 0 && (
              <div>
                <label
                  htmlFor="printing-select"
                  className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mtg-muted)]"
                >
                  Printing
                </label>
                <select
                  id="printing-select"
                  value={selectedPrinting?.id ?? item.id}
                  onChange={(e) => setSelectedPrintingId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-2 py-1.5 text-xs text-[var(--color-mtg-text)]"
                >
                  {sortedPrintings.map((printing, i) => (
                    <option key={printing.id} value={printing.id}>
                      {i === 0 && printing.prices?.usd ? 'Cheapest · ' : ''}
                      {printingLabel(printing)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-mtg-muted)]">
              <span>Identity: {item.color_identity.join('') || 'C'}</span>
              <span>CMC: {item.cmc}</span>
              {price ? (
                <span className="text-[var(--color-mtg-gold)]">
                  ${price}
                  {isCheapest && sortedPrintings.length > 1 && (
                    <span className="ml-1 text-[var(--color-mtg-muted)]">(cheapest)</span>
                  )}
                </span>
              ) : (
                <span className="text-[var(--color-mtg-muted)]">—</span>
              )}
              {popularityRank && <span>Popularity {popularityRank}</span>}
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mtg-muted)]">
                Oracle text
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[var(--color-mtg-text)]">
                {item.oracle_text || 'No rules text.'}
              </p>
            </div>

            {insight.buildTips.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mtg-gold)]">
                  Build insight
                </p>
                <ul className="mt-1 space-y-1 text-[var(--color-mtg-text)]">
                  {insight.buildTips.map((tip) => (
                    <li key={tip}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {insight.synergies.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-mtg-gold)]">
                  Synergies
                </p>
                <ul className="mt-1 space-y-1 text-[var(--color-mtg-muted)]">
                  {insight.synergies.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {insight.deckRoles.length > 0 && (
              <p className="text-xs text-[var(--color-mtg-muted)]">
                Deck roles: {insight.deckRoles.join(', ')}
              </p>
            )}

            <p className="text-[10px] text-[var(--color-mtg-muted)]">
              Tips are based on this card&apos;s rules text and deck archetypes — not live meta data.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--color-mtg-border)] px-4 py-3">
          <a
            href={scryfallUri}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--color-mtg-muted)] hover:text-[var(--color-mtg-gold)]"
          >
            View full card on Scryfall →
          </a>
        </div>
      </div>
    </div>
  )
}
