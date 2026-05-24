import { useEffect, useMemo, useRef, useState } from 'react'
import type { CardRecord } from '../types/card'
import type { CardSort, ColorChoice, ScryfallCard } from '../types/mtg'
import { ColorPicker } from '../components/ColorPicker'
import { CardGrid } from '../components/CardGrid'
import { useCardDetail } from '../context/CardDetailContext'
import { usePopularity } from '../context/PopularityContext'
import { cardRecordToScryfall, loadCardDatabase } from '../lib/card-db'
import { cardToDetail } from '../lib/card-insight'
import {
  describeCardFilters,
  hasActiveFilters,
  searchCardsFiltered,
  suggestContainsWords,
  suggestTypes,
  type CardFilters,
} from '../lib/card-filter-search'
import {
  describeGroqInterpretation,
  matchCardsByGroqPrompt,
} from '../lib/card-prompt-groq'
import { suggestCardNames } from '../lib/card-name-resolve'
import { parseColorChoices } from '../lib/color-filter'

type SearchMode = 'filter' | 'prompt'
type FilterPanel = 'type' | 'cmc' | 'words' | null

const SORT_OPTIONS: { value: CardSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name', label: 'Name (A → Z)' },
  { value: 'cmc', label: 'Mana value (low → high)' },
  { value: 'usd', label: 'Price (high → low)' },
  { value: 'edhrec', label: 'Popularity' },
]

const NAME_HINTS = ['Sol Ring', 'Lightning Bolt', 'Counterspell', 'Rhystic Study']

const PROMPT_HINTS = [
  'tutor for a creature',
  'whenever a creature enters draw',
  'flying blocker',
  'board wipe',
  'faerie',
]

const CMC_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: '0', max: 0 },
  { label: '1', max: 1 },
  { label: '2', max: 2 },
  { label: '3', max: 3 },
  { label: '4', max: 4 },
  { label: '5', max: 5 },
  { label: '6', max: 6 },
  { label: '7+', min: 7 },
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

function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-mtg-gold-dim)] bg-[var(--color-mtg-bg)] px-2.5 py-1 text-xs text-[var(--color-mtg-gold)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-[var(--color-mtg-muted)] hover:text-red-400"
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  )
}

export function FindCard() {
  const { showPopularity } = usePopularity()
  const { openDetail } = useCardDetail()
  const [searchMode, setSearchMode] = useState<SearchMode>('filter')
  const [promptQuery, setPromptQuery] = useState('')
  const [cardName, setCardName] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [cmcMin, setCmcMin] = useState<number | undefined>()
  const [cmcMax, setCmcMax] = useState<number | undefined>()
  const [containsWords, setContainsWords] = useState<string[]>([])
  const [openPanel, setOpenPanel] = useState<FilterPanel>(null)
  const [typeDraft, setTypeDraft] = useState('')
  const [wordDraft, setWordDraft] = useState('')
  const [colors, setColors] = useState<ColorChoice[]>([])
  const [sort, setSort] = useState<CardSort>('relevance')
  const [cards, setCards] = useState<ScryfallCard[]>([])
  const [cardRecords, setCardRecords] = useState<Map<string, CardRecord>>(new Map())
  const [scores, setScores] = useState<Map<string, number>>(new Map())
  const [dbLoading, setDbLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [dbCount, setDbCount] = useState(0)
  const [groqNote, setGroqNote] = useState('')
  const [noStrongMatch, setNoStrongMatch] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const sortOptions = cardSortOptions(showPopularity)

  const cardFilters: CardFilters = useMemo(
    () => ({
      name: cardName,
      types,
      cmcMin,
      cmcMax,
      containsWords,
    }),
    [cardName, types, cmcMin, cmcMax, containsWords],
  )

  const nameSuggestions = useMemo(
    () => (showNameSuggestions ? suggestCardNames(cardName) : []),
    [cardName, showNameSuggestions],
  )

  const typeSuggestions = useMemo(
    () => suggestTypes(typeDraft).filter((t) => !types.includes(t)),
    [typeDraft, types],
  )

  const wordSuggestions = useMemo(
    () =>
      suggestContainsWords(wordDraft).filter((w) => !containsWords.includes(w)),
    [wordDraft, containsWords],
  )

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

  const applyFilterResults = (results: CardRecord[]) => {
    if (results.length === 0) {
      setCards([])
      setScores(new Map())
      setCardRecords(new Map())
      setError('No cards matched those filters.')
      return
    }

    const scoreMap = new Map<string, number>()
    const recordMap = new Map<string, CardRecord>()
    for (let i = 0; i < results.length; i++) {
      const card = results[i]
      scoreMap.set(card.id, Math.max(1, 100 - i))
      recordMap.set(card.id, card)
    }

    setScores(scoreMap)
    setCardRecords(recordMap)
    setCards(results.map((c) => cardRecordToScryfall(c)))
    setError(null)
  }

  const searchFilter = async () => {
    if (!hasActiveFilters(cardFilters)) {
      setError('Enter a card name or add at least one filter.')
      setCards([])
      return
    }

    setHint(describeCardFilters(cardFilters))

    const db = await loadCardDatabase()
    const results = searchCardsFiltered(
      db.cards,
      cardFilters,
      parseColorChoices(colors),
      175,
    )
    applyFilterResults(results)
  }

  const searchPrompt = async () => {
    if (!promptQuery.trim()) {
      setError('Describe what the card should do in plain language.')
      setCards([])
      return
    }

    setGroqNote('')

    const db = await loadCardDatabase()
    const { matches, weakMatch, interpretation, usedGroq, groqUnavailable } =
      await matchCardsByGroqPrompt(
        db.cards,
        promptQuery,
        parseColorChoices(colors),
        120,
      )

    if (interpretation) {
      setHint(describeGroqInterpretation(interpretation))
    } else {
      setHint('')
    }

    if (groqUnavailable) {
      setGroqNote(
        'Groq unavailable — using local matching only. Run locally with GROQ_API_KEY or use the Vercel deployment.',
      )
    } else if (usedGroq) {
      setGroqNote('Interpreted with Groq · matched against local card database')
    }

    if (matches.length === 0) {
      setCards([])
      setScores(new Map())
      setCardRecords(new Map())
      setNoStrongMatch(true)
      setError(
        'No strong matches for that prompt. Try describing the full ability, or switch to Card search for names and filters.',
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
        `Best match is only ${matches[0].matchPercent}% — results may not do exactly what you described.`,
      )
    } else {
      setError(null)
    }
  }

  const search = async () => {
    setSearching(true)
    setError(null)
    setNoStrongMatch(false)
    setHint('')

    try {
      if (searchMode === 'filter') {
        await searchFilter()
      } else {
        await searchPrompt()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setCards([])
    } finally {
      setSearching(false)
    }
  }

  const addType = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || types.includes(trimmed)) return
    setTypes((prev) => [...prev, trimmed])
    setTypeDraft('')
    setOpenPanel(null)
  }

  const addWord = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed || containsWords.includes(trimmed)) return
    setContainsWords((prev) => [...prev, trimmed])
    setWordDraft('')
    setOpenPanel(null)
  }

  const applyCmcPreset = (preset: (typeof CMC_PRESETS)[number]) => {
    setCmcMin(preset.min)
    setCmcMax(preset.max)
    setOpenPanel(null)
  }

  const cmcLabel = () => {
    if (cmcMin != null && cmcMax != null) return `CMC ${cmcMin}–${cmcMax}`
    if (cmcMax != null) return `CMC ≤ ${cmcMax}`
    if (cmcMin != null) return `CMC ≥ ${cmcMin}`
    return ''
  }

  const togglePanel = (panel: FilterPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
          Find a Card
        </h2>
        <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
          {searchMode === 'filter'
            ? 'Search by card name and filters — type, mana value, and oracle text keywords.'
            : 'Natural language — describe the ability you want. Groq (Llama) interprets your prompt, then we match oracle text locally.'}
        </p>
        {!dbLoading && dbCount > 0 && (
          <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
            {dbCount.toLocaleString()} Commander-legal cards
            {searchMode === 'filter' ? ' · instant local search' : ''}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSearchMode('filter')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                searchMode === 'filter'
                  ? 'bg-[var(--color-mtg-gold)] text-black'
                  : 'border border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)]'
              }`}
            >
              Card search
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('prompt')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                searchMode === 'prompt'
                  ? 'bg-[var(--color-mtg-gold)] text-black'
                  : 'border border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)]'
              }`}
            >
              AI prompt match
            </button>
          </div>

          {searchMode === 'filter' ? (
            <>
              <div className="relative">
                <label className="text-sm text-[var(--color-mtg-muted)]">Card name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value)
                    setShowNameSuggestions(true)
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowNameSuggestions(false)
                      if (!dbLoading) search()
                    }
                  }}
                  placeholder="Start typing a card name…"
                  className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
                />
                <SuggestionList
                  items={nameSuggestions}
                  onPick={(name) => {
                    setCardName(name)
                    setShowNameSuggestions(false)
                    nameInputRef.current?.focus()
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {NAME_HINTS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setCardName(h)}
                      className="rounded-full border border-[var(--color-mtg-border)] px-2 py-0.5 text-[10px] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-[var(--color-mtg-muted)]">Filters</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => togglePanel('type')}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      openPanel === 'type'
                        ? 'border-[var(--color-mtg-gold)] text-[var(--color-mtg-gold)]'
                        : 'border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]'
                    }`}
                  >
                    + Card type
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel('cmc')}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      openPanel === 'cmc'
                        ? 'border-[var(--color-mtg-gold)] text-[var(--color-mtg-gold)]'
                        : 'border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]'
                    }`}
                  >
                    + CMC
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePanel('words')}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      openPanel === 'words'
                        ? 'border-[var(--color-mtg-gold)] text-[var(--color-mtg-gold)]'
                        : 'border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]'
                    }`}
                  >
                    + Contains words
                  </button>
                </div>

                {openPanel === 'type' && (
                  <div className="relative mt-3">
                    <input
                      type="text"
                      value={typeDraft}
                      onChange={(e) => setTypeDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addType(typeDraft)
                      }}
                      placeholder="Type a card type (e.g. Instant, Creature)…"
                      autoFocus
                      className="w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
                    />
                    <SuggestionList items={typeSuggestions} onPick={addType} />
                  </div>
                )}

                {openPanel === 'cmc' && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-[var(--color-mtg-muted)]">
                      Pick a mana value range
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CMC_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyCmcPreset(preset)}
                          className="rounded-lg border border-[var(--color-mtg-border)] px-3 py-1.5 text-xs text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {openPanel === 'words' && (
                  <div className="relative mt-3">
                    <input
                      type="text"
                      value={wordDraft}
                      onChange={(e) => setWordDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addWord(wordDraft)
                      }}
                      placeholder="Type words from oracle text (e.g. draw, flying)…"
                      autoFocus
                      className="w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
                    />
                    <SuggestionList items={wordSuggestions} onPick={addWord} />
                  </div>
                )}

                {(types.length > 0 ||
                  containsWords.length > 0 ||
                  cmcMin != null ||
                  cmcMax != null) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {types.map((t) => (
                      <FilterChip
                        key={t}
                        label={t}
                        onRemove={() => setTypes((prev) => prev.filter((x) => x !== t))}
                      />
                    ))}
                    {(cmcMin != null || cmcMax != null) && (
                      <FilterChip
                        label={cmcLabel()}
                        onRemove={() => {
                          setCmcMin(undefined)
                          setCmcMax(undefined)
                        }}
                      />
                    )}
                    {containsWords.map((w) => (
                      <FilterChip
                        key={w}
                        label={`"${w}"`}
                        onRemove={() =>
                          setContainsWords((prev) => prev.filter((x) => x !== w))
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm text-[var(--color-mtg-muted)]">
                What are you looking for?
              </label>
              <input
                type="text"
                value={promptQuery}
                onChange={(e) => setPromptQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !dbLoading && search()}
                placeholder="e.g. tutor for a creature, whenever a creature enters draw"
                className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {PROMPT_HINTS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPromptQuery(h)}
                    className="rounded-full border border-[var(--color-mtg-border)] px-2 py-0.5 text-[10px] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ColorPicker selected={colors} onChange={setColors} />

          <div>
            <label className="text-sm text-[var(--color-mtg-muted)]">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CardSort)}
              className="mt-1 block rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={search}
            disabled={dbLoading || searching}
            className="rounded-lg bg-[var(--color-mtg-gold)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {dbLoading ? 'Loading…' : searching ? (searchMode === 'prompt' ? 'Understanding…' : 'Searching…') : 'Search Cards'}
          </button>
        </div>

        {groqNote && searchMode === 'prompt' && (
          <p className="mt-2 text-xs text-[var(--color-mtg-muted)]">{groqNote}</p>
        )}
        {hint && (
          <p className="mt-3 text-xs text-[var(--color-mtg-gold)]">{hint}</p>
        )}
        {error && (
          <p className={`mt-3 text-sm ${noStrongMatch ? 'text-amber-400' : 'text-red-400'}`}>
            {error}
          </p>
        )}
        {displayCards.length > 0 && (
          <p className="mt-2 text-xs text-[var(--color-mtg-muted)]">
            {displayCards.length} cards
          </p>
        )}
      </section>

      <CardGrid
        cards={displayCards}
        scores={searchMode === 'prompt' ? scores : undefined}
        loading={searching}
        onCardClick={(card) => {
          const record = cardRecords.get(card.id)
          if (record) openDetail(cardToDetail(record))
        }}
        emptyMessage={
          dbLoading
            ? 'Loading card database…'
            : searchMode === 'filter'
              ? 'Enter a card name or add filters, then search.'
              : 'Describe an ability to search.'
        }
      />
    </div>
  )
}
