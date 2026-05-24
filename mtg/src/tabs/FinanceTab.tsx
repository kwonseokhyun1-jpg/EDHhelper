import { useEffect, useMemo, useRef, useState } from 'react'
import {
  bestCardPriceUsd,
  cardRecordToScryfall,
  formatCardPrice,
  getCardByNameLocal,
  loadCardDatabase,
} from '../lib/card-db'
import { suggestCardNames } from '../lib/card-name-resolve'
import {
  getStaplesForColor,
  sortStaples,
  STAPLE_COLORS,
  STAPLE_SORT_OPTIONS,
  type StapleColor,
  type StapleSort,
} from '../lib/staples'
import {
  fetchTcgplayerPriceHistory,
  resolveTcgplayerProductId,
  tcgplayerProductUrl,
  type PriceSnapshot,
} from '../lib/price-history'
import { useCardDetail } from '../context/CardDetailContext'
import { cardToDetail } from '../lib/card-insight'
import { PriceHistoryChart } from '../components/PriceHistoryChart'
import type { CardRecord } from '../types/card'
import type { ScryfallCard } from '../types/mtg'

const COLOR_BTN: Record<StapleColor, string> = {
  W: 'bg-[#f8e7b9] text-black',
  U: 'bg-[#0e68ab] text-white',
  B: 'bg-[#3d3429] text-[#e6edf3]',
  R: 'bg-[#d3202a] text-white',
  G: 'bg-[#00733e] text-white',
  C: 'bg-[#9ca3af] text-black',
}

function SuggestionList({
  items,
  onPick,
}: {
  items: string[]
  onPick: (value: string) => void
}) {
  if (items.length === 0) return null
  return (
    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] shadow-lg">
      {items.map((item) => (
        <li key={item}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-mtg-panel)]"
          >
            {item}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function FinanceTab() {
  const { openDetail } = useCardDetail()
  const [searchName, setSearchName] = useState('')
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [lookupCard, setLookupCard] = useState<CardRecord | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceSnapshot[]>([])
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false)
  const [priceHistoryError, setPriceHistoryError] = useState<string | null>(null)
  const [tcgplayerUrl, setTcgplayerUrl] = useState<string | null>(null)
  const [allCards, setAllCards] = useState<CardRecord[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [stapleColor, setStapleColor] = useState<StapleColor>('W')
  const [stapleSort, setStapleSort] = useState<StapleSort>('popularity')
  const [deckValueInput, setDeckValueInput] = useState('')
  const [deckCards, setDeckCards] = useState<ScryfallCard[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCardDatabase()
      .then((db) => {
        setAllCards(db.cards)
        setDbLoading(false)
      })
      .catch(() => setDbLoading(false))
  }, [])

  const nameSuggestions = useMemo(
    () => (showNameSuggestions ? suggestCardNames(searchName) : []),
    [searchName, showNameSuggestions],
  )

  const staples = useMemo(() => {
    const filtered = getStaplesForColor(allCards, stapleColor)
    return sortStaples(filtered, stapleSort)
  }, [allCards, stapleColor, stapleSort])

  const staplesDisplay = useMemo(() => staples.slice(0, 300), [staples])
  const staplesTruncated = staples.length > staplesDisplay.length

  const lookupCardPrice = lookupCard
    ? parseFloat(bestCardPriceUsd(lookupCard) ?? '0') || undefined
    : undefined

  const search = async (nameOverride?: string) => {
    const query = (nameOverride ?? searchName).trim()
    if (!query) return
    setSearchName(query)
    setShowNameSuggestions(false)
    const found = getCardByNameLocal(query)
    setLookupCard(found ?? null)
    setPriceHistory([])
    setPriceHistoryError(null)
    setTcgplayerUrl(null)

    if (!found) return

    setPriceHistoryLoading(true)
    try {
      const productId = await resolveTcgplayerProductId(found)
      if (!productId) {
        setPriceHistoryError('No TCGPlayer listing found for this card.')
        return
      }
      setTcgplayerUrl(tcgplayerProductUrl(productId))
      const history = await fetchTcgplayerPriceHistory(productId)
      setPriceHistory(history)
      if (history.length === 0) {
        setPriceHistoryError('TCGPlayer returned no price history for this product.')
      }
    } catch (e) {
      setPriceHistoryError(
        e instanceof Error ? e.message : 'Could not load TCGPlayer price history.',
      )
    } finally {
      setPriceHistoryLoading(false)
    }
  }

  const analyzeDeckValue = () => {
    const names = deckValueInput
      .split(/\r?\n/)
      .map((l) => l.replace(/^\d+x?\s+/i, '').trim())
      .filter(Boolean)

    const priced: ScryfallCard[] = []
    for (const name of names) {
      const found = getCardByNameLocal(name)
      if (found) priced.push(cardRecordToScryfall(found))
    }
    setDeckCards(
      priced.sort((a, b) => {
        const pa = parseFloat(a.prices.usd ?? '0') || 0
        const pb = parseFloat(b.prices.usd ?? '0') || 0
        return pb - pa
      }),
    )
  }

  const deckTotal = useMemo(
    () => deckCards.reduce((s, c) => s + (parseFloat(c.prices.usd ?? '0') || 0), 0),
    [deckCards],
  )

  const maxPrice = useMemo(
    () => Math.max(...deckCards.map((c) => parseFloat(c.prices.usd ?? '0') || 0), 1),
    [deckCards],
  )

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
          Finance
        </h2>
        <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
          TCGPlayer market prices — 6-month history chart when you look up a card.
        </p>

        <div className="relative mt-4 flex flex-wrap gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value)
              setShowNameSuggestions(true)
            }}
            onFocus={() => setShowNameSuggestions(true)}
            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search()
            }}
            placeholder="Start typing a card name…"
            className="min-w-[200px] flex-1 rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
          />
          <SuggestionList
            items={nameSuggestions}
            onPick={(name) => {
              setSearchName(name)
              search(name)
              searchInputRef.current?.focus()
            }}
          />
          <button
            type="button"
            onClick={() => search()}
            className="rounded-lg bg-[var(--color-mtg-gold)] px-4 py-2 text-sm font-semibold text-black"
          >
            Search
          </button>
        </div>

        {lookupCard && (
          <div className="mt-4 space-y-4 rounded-lg border border-[var(--color-mtg-border)] p-4">
            <button
              type="button"
              onClick={() => openDetail(cardToDetail(lookupCard))}
              className="flex w-full flex-wrap items-start gap-4 text-left transition hover:opacity-90"
            >
              {lookupCard.image && (
                <img src={lookupCard.image} alt={lookupCard.name} className="w-28 rounded" />
              )}
              <div className="text-sm">
                <p className="text-lg font-semibold">{lookupCard.name}</p>
                <p className="text-2xl font-bold text-[var(--color-mtg-gold)]">
                  {formatCardPrice(lookupCard)}
                </p>
                {lookupCard.edhrec_rank && (
                  <p className="text-[var(--color-mtg-muted)]">
                    Rank #{lookupCard.edhrec_rank.toLocaleString()}
                  </p>
                )}
                <p className="mt-2 text-xs text-[var(--color-mtg-muted)]">
                  Click for build insight
                </p>
              </div>
            </button>
            <PriceHistoryChart
              history={priceHistory}
              currentPrice={lookupCardPrice}
              loading={priceHistoryLoading}
              error={priceHistoryError}
              tcgplayerUrl={tcgplayerUrl ?? undefined}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold">Staples by color</h3>
            <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
              Commonly played non-land cards in each color identity
            </p>
          </div>
          <div>
            <label className="text-xs text-[var(--color-mtg-muted)]">Sort by</label>
            <select
              value={stapleSort}
              onChange={(e) => setStapleSort(e.target.value as StapleSort)}
              className="mt-1 block rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
            >
              {STAPLE_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STAPLE_COLORS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStapleColor(id)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${COLOR_BTN[id]} ${
                stapleColor === id
                  ? 'ring-2 ring-[var(--color-mtg-gold)] ring-offset-2 ring-offset-[var(--color-mtg-bg)]'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {dbLoading ? (
          <p className="mt-6 animate-pulse text-sm text-[var(--color-mtg-muted)]">Loading staples…</p>
        ) : (
          <>
            <p className="mt-3 text-xs text-[var(--color-mtg-muted)]">
              {staples.length.toLocaleString()} staples
              {staplesTruncated ? ` (showing first ${staplesDisplay.length})` : ''} · sorted by{' '}
              {STAPLE_SORT_OPTIONS.find((o) => o.value === stapleSort)?.label.toLowerCase()}
            </p>
            <div className="mt-3 max-h-[32rem] overflow-auto rounded-lg border border-[var(--color-mtg-border)]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-mtg-panel)] text-xs text-[var(--color-mtg-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Card</th>
                    <th className="px-3 py-2 font-medium">Rank</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">CMC</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {staplesDisplay.map((c, i) => (
                    <tr
                      key={c.id}
                      className="border-t border-[var(--color-mtg-border)] hover:bg-white/5"
                    >
                      <td className="px-3 py-2 text-[var(--color-mtg-muted)]">{i + 1}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openDetail(cardToDetail(c))}
                          className="flex items-center gap-2 text-left hover:text-[var(--color-mtg-gold)]"
                        >
                          {c.image && (
                            <img src={c.image} alt="" className="h-8 w-6 rounded object-cover" />
                          )}
                          <span className="font-medium">{c.name}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-[var(--color-mtg-gold)]">
                        #{c.edhrec_rank?.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {formatCardPrice(c)}
                      </td>
                      <td className="px-3 py-2">{c.cmc}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2 text-xs text-[var(--color-mtg-muted)]">
                        {c.type_line}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h3 className="font-semibold">Deck value chart</h3>
        <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
          Paste card names (one per line) for a price breakdown.
        </p>
        <textarea
          value={deckValueInput}
          onChange={(e) => setDeckValueInput(e.target.value)}
          rows={5}
          className="mt-3 w-full rounded border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 font-mono text-xs"
          placeholder={'1 Sol Ring\n1 Rhystic Study\n1 Cyclonic Rift'}
        />
        <button
          type="button"
          onClick={analyzeDeckValue}
          className="mt-2 rounded-lg bg-[var(--color-mtg-gold)] px-4 py-2 text-sm font-semibold text-black"
        >
          Chart prices
        </button>

        {deckCards.length > 0 && (
          <div className="mt-4">
            <p className="text-sm">
              Total:{' '}
              <span className="font-bold text-[var(--color-mtg-gold)]">${deckTotal.toFixed(2)}</span>
              <span className="text-[var(--color-mtg-muted)]"> ({deckCards.length} cards)</span>
            </p>
            <ul className="mt-3 space-y-2">
              {deckCards.map((c) => {
                const price = parseFloat(c.prices.usd ?? '0') || 0
                const pct = (price / maxPrice) * 100
                return (
                  <li key={c.id} className="text-xs">
                    <div className="mb-0.5 flex justify-between">
                      <span className="truncate pr-2">{c.name}</span>
                      <span className="shrink-0 text-[var(--color-mtg-gold)]">${price.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-mtg-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-mtg-gold)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
