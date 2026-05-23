import { useEffect, useState } from 'react'
import type { CommanderMatch, CommanderPairMatch } from '../types/commander'
import type { ColorChoice } from '../types/mtg'
import { ColorPicker } from '../components/ColorPicker'
import { CommanderPairResults } from '../components/CommanderPairResults'
import { CommanderResults } from '../components/CommanderResults'
import { usePopularity } from '../context/PopularityContext'
import { loadCommanderDatabase } from '../lib/commander-db'
import { parseColorChoices } from '../lib/color-filter'
import { describeTheme, matchCommanders } from '../lib/commander-match'
import { COMMANDER_SORT_OPTIONS, type CommanderSort } from '../lib/edhrec'
import { matchCommanderPairs } from '../lib/partner-match'

const PLAYSTYLE_HINTS = [
  'stax taxes',
  'tokens and go-wide',
  'aristocrats sacrifice',
  'lands matter',
  'spellslinger instants',
  '+1/+1 counters',
  'voltron equipment',
  'group hug politics',
  'elf tribal',
  'blink etb',
  'flying deathtouch',
  'partner aggro',
]

export function FindCommander() {
  const { setShowPopularity } = usePopularity()
  const [theme, setTheme] = useState('')
  const [colors, setColors] = useState<ColorChoice[]>([])
  const [showPairs, setShowPairs] = useState(false)
  const [sort, setSort] = useState<CommanderSort>('match')
  const [matches, setMatches] = useState<CommanderMatch[]>([])
  const [pairMatches, setPairMatches] = useState<CommanderPairMatch[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbCount, setDbCount] = useState(0)
  const [themeHint, setThemeHint] = useState('')

  useEffect(() => {
    setShowPopularity(sort === 'popularity')
  }, [sort, setShowPopularity])

  useEffect(() => {
    loadCommanderDatabase()
      .then((db) => {
        setDbCount(db.count)
        setDbLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load commander database')
        setDbLoading(false)
      })
  }, [])

  const search = async () => {
    setSearching(true)
    setError(null)
    setThemeHint(describeTheme(theme))

    try {
      const db = await loadCommanderDatabase()
      const colorFilter = parseColorChoices(colors)

      if (showPairs) {
        const pairs = matchCommanderPairs(db.commanders, theme, colorFilter, 24, sort)
        setPairMatches(pairs)
        setMatches([])

        if (pairs.length === 0) {
          setError(
            theme.trim()
              ? 'No compatible commander pairs matched that theme in your colors.'
              : 'No partner pairs found in those colors.',
          )
        }
      } else {
        const results = matchCommanders(db.commanders, theme, colorFilter, 60, sort)
        setMatches(results)
        setPairMatches([])

        if (results.length === 0) {
          setError(
            theme.trim()
              ? 'No commanders matched that theme in your colors. Try fewer colors or a broader description.'
              : 'No commanders in those colors. Try clearing the color filter.',
          )
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setMatches([])
      setPairMatches([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
          Find a Commander
        </h2>
        <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
          Describe a playstyle, theme, or keyword. Leave blank to browse commanders in your colors.
        </p>
        {!dbLoading && dbCount > 0 && (
          <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
            {dbCount.toLocaleString()} commanders loaded
          </p>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-[var(--color-mtg-muted)]">Playstyle / theme</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !dbLoading && search()}
              placeholder="e.g. stax taxes, aristocrats sacrifice, elf tribal"
              className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {PLAYSTYLE_HINTS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setTheme(hint)}
                  className="rounded-full border border-[var(--color-mtg-border)] px-2 py-0.5 text-[10px] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>

          <ColorPicker selected={colors} onChange={setColors} />

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="text-sm text-[var(--color-mtg-muted)]">Sort by</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as CommanderSort)}
                className="mt-1 block rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-mtg-gold)]"
              >
                {COMMANDER_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm">
              <input
                type="checkbox"
                checked={showPairs}
                onChange={(e) => setShowPairs(e.target.checked)}
                className="accent-[var(--color-mtg-gold)]"
              />
              Show partner pairs
            </label>
          </div>

          <button
            type="button"
            onClick={search}
            disabled={dbLoading || searching}
            className="rounded-lg bg-[var(--color-mtg-gold)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {dbLoading
              ? 'Loading database…'
              : searching
                ? 'Matching…'
                : showPairs
                  ? 'Find Pairs'
                  : 'Find Commanders'}
          </button>
        </div>

        {themeHint && (
          <p className="mt-3 text-xs text-[var(--color-mtg-gold)]">{themeHint}</p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      {showPairs ? (
        <CommanderPairResults
          pairs={pairMatches}
          loading={searching}
          emptyMessage={
            dbLoading ? 'Loading commander database…' : 'Search to find partner pairs.'
          }
        />
      ) : (
        <CommanderResults
          matches={matches}
          loading={searching}
          emptyMessage={
            dbLoading ? 'Loading commander database…' : 'Enter a theme and search.'
          }
        />
      )}
    </div>
  )
}
