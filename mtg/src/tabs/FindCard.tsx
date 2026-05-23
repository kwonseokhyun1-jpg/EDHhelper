import { useEffect, useMemo, useState } from 'react'
import type { CardRecord } from '../types/card'
import type { CardSort, ColorChoice, ScryfallCard } from '../types/mtg'
import { ColorPicker } from '../components/ColorPicker'
import { CardGrid } from '../components/CardGrid'
import { useCardDetail } from '../context/CardDetailContext'
import { usePopularity } from '../context/PopularityContext'
import { cardRecordToScryfall, loadCardDatabase } from '../lib/card-db'
import { cardToDetail } from '../lib/card-insight'
import {
  describeCardPrompt,
  matchCardsByPrompt,
} from '../lib/card-prompt-match'
import { parseColorChoices } from '../lib/color-filter'
import { normalizeWithTypos } from '../lib/fuzzy-text'

const SORT_OPTIONS: { value: CardSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name', label: 'Name (A → Z)' },
  { value: 'cmc', label: 'Mana value (low → high)' },
  { value: 'usd', label: 'Price (high → low)' },
  { value: 'edhrec', label: 'Popularity' },
]

function cardSortOptions(showPopularity: boolean) {
  return showPopularity
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((o) => o.value !== 'edhrec')
}

function sortFindCardResults(
  cards: ScryfallCard[],
  sort: CardSort,
  scores: Map<string, number>,
): ScryfallCard[] {
  if (sort === 'relevance') {
    return [...cards].sort(
      (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
    )
  }

  return [...cards].sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'cmc':
        return a.cmc - b.cmc || a.name.localeCompare(b.name)
      case 'usd': {
        const pa = parseFloat(a.prices.usd ?? '0') || 0
        const pb = parseFloat(b.prices.usd ?? '0') || 0
        return pb - pa
      }
      case 'edhrec':
        return (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999)
      default:
        return 0
    }
  })
}

export function FindCard() {
  const { showPopularity } = usePopularity()
  const { openDetail } = useCardDetail()
  const [prompt, setPrompt] = useState('')
  const [colors, setColors] = useState<ColorChoice[]>([])
  const [sort, setSort] = useState<CardSort>('relevance')
  const [cards, setCards] = useState<ScryfallCard[]>([])
  const [cardRecords, setCardRecords] = useState<Map<string, CardRecord>>(new Map())
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [dbLoading, setDbLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promptHint, setPromptHint] = useState('')
  const [dbCount, setDbCount] = useState(0)
  const [typoNote, setTypoNote] = useState('')
  const [noStrongMatch, setNoStrongMatch] = useState(false)

  const sortOptions = cardSortOptions(showPopularity)

  useEffect(() => {
    if (!showPopularity && sort === 'edhrec') setSort('relevance')
  }, [showPopularity, sort])

  useEffect(() => {
    loadCardDatabase()
      .then((db) => {
        setDbCount(db.count)
        setDbLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load card database')
        setDbLoading(false)
      })
  }, [])

  const displayCards = useMemo(
    () => sortFindCardResults(cards, sort, scores),
    [cards, sort, scores],
  )

  const search = async () => {
    if (!prompt.trim()) {
      setError('Describe what the card should do — e.g. "tutor for a creature" or "whenever a creature enters, draw a card".')
      setCards([])
      return
    }

    setSearching(true)
    setError(null)
    setNoStrongMatch(false)
    setTypoNote('')
    const { corrections } = normalizeWithTypos(prompt)
    if (corrections.length > 0) {
      setTypoNote(`Corrected: ${corrections.join(', ')}`)
    }
    setPromptHint(describeCardPrompt(prompt))

    try {
      const db = await loadCardDatabase()
      const { matches, weakMatch } = matchCardsByPrompt(
        db.cards,
        prompt,
        parseColorChoices(colors),
        80,
      )

      if (matches.length === 0) {
        setCards([])
        setScores(new Map())
        setNoStrongMatch(true)
        setError(
          'No strong matches for that prompt. Try describing the full ability — e.g. "tutor for an enchantment" or "whenever a creature enters, draw a card".',
        )
        return
      }

      const scoreMap = new Map<string, number>()
      for (const m of matches) {
        scoreMap.set(m.card.id, m.matchPercent)
      }

      setScores(scoreMap)
      setCardRecords(new Map(matches.map((m) => [m.card.id, m.card])))
      setCards(matches.map((m) => cardRecordToScryfall(m.card)))
      setNoStrongMatch(weakMatch)

      if (weakMatch) {
        setError(
          `Best match is only ${matches[0].matchPercent}% — results may not do exactly what you described. Try being more specific.`,
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setCards([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
          Find a Card
        </h2>
        <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
          Describe the card ability you want.
        </p>
        {!dbLoading && dbCount > 0 && (
          <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
            {dbCount.toLocaleString()} Commander-legal cards loaded locally
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm text-[var(--color-mtg-muted)]">What are you looking for?</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !dbLoading && search()}
              placeholder='e.g. tutor for a creature, whenever a creature enters draw a card'
              className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
            />
          </div>

          <ColorPicker selected={colors} onChange={setColors} />

          <div>
            <label className="text-sm text-[var(--color-mtg-muted)]">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CardSort)}
              className="mt-1 block w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={search}
          disabled={dbLoading || searching}
          className="mt-4 rounded-lg bg-[var(--color-mtg-gold)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {dbLoading ? 'Loading database…' : searching ? 'Matching…' : 'Search Cards'}
        </button>

        {typoNote && (
          <p className="mt-2 text-xs text-[var(--color-mtg-muted)]">{typoNote}</p>
        )}
        {promptHint && (
          <p className="mt-3 text-xs text-[var(--color-mtg-gold)]">{promptHint}</p>
        )}
        {error && (
          <p className={`mt-3 text-sm ${noStrongMatch ? 'text-amber-400' : 'text-red-400'}`}>
            {error}
          </p>
        )}
        {displayCards.length > 0 && !noStrongMatch && (
          <p className="mt-2 text-xs text-[var(--color-mtg-muted)]">
            {displayCards.length} cards
          </p>
        )}
      </section>

      <CardGrid
        cards={displayCards}
        scores={scores}
        loading={searching}
        onCardClick={(card) => {
          const record = cardRecords.get(card.id)
          if (record) openDetail(cardToDetail(record))
        }}
        emptyMessage={
          dbLoading
            ? 'Loading card database…'
            : 'Describe an ability to search.'
        }
      />
    </div>
  )
}
