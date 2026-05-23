import { useEffect, useState } from 'react'
import type { Bracket, DeckAnalysis } from '../types/mtg'
import type { UpgradeRecommendation } from '../types/card'
import { cardImage } from '../api/scryfall'
import { UpgradeSuggestions } from '../components/UpgradeSuggestions'
import { useAuth } from '../context/AuthContext'
import { howToBeat } from '../lib/advice'
import { loadCardDatabase } from '../lib/card-db'
import { analyzeDecklist } from '../lib/decklist'
import { suggestUpgradesLocal } from '../lib/upgrade-match'

type PlaytestState = {
  library: string[]
  hand: string[]
  battlefield: string[]
  graveyard: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function DecklistTab({
  initialText = '',
  onTextChange,
}: {
  initialText?: string
  onTextChange?: (text: string) => void
}) {
  const { saveDecklist } = useAuth()
  const [text, setText] = useState(initialText)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bracket, setBracket] = useState<Bracket>(3)
  const [budget, setBudget] = useState(150)
  const [feedback, setFeedback] = useState('')
  const [playtest, setPlaytest] = useState<PlaytestState | null>(null)
  const [activeSection, setActiveSection] = useState<
    'overview' | 'playtest' | 'upgrades' | 'beat' | 'feedback'
  >('overview')
  const [cardDbReady, setCardDbReady] = useState(false)
  const [cardDbCount, setCardDbCount] = useState(0)

  useEffect(() => {
    loadCardDatabase()
      .then((db) => {
        setCardDbCount(db.count)
        setCardDbReady(true)
      })
      .catch(() => setCardDbReady(false))
  }, [])

  useEffect(() => {
    setText(initialText)
  }, [initialText])

  const updateText = (value: string) => {
    setText(value)
    onTextChange?.(value)
  }

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeDecklist(text)
      setAnalysis(result)
      setActiveSection('overview')
      setPlaytest(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse decklist')
    } finally {
      setLoading(false)
    }
  }

  const startPlaytest = () => {
    if (!analysis) return
    const names: string[] = []
    for (const c of analysis.cards) {
      if (!c.card) continue
      for (let i = 0; i < c.quantity; i++) names.push(c.name)
    }
    const library = shuffle(names)
    const hand = library.splice(0, 7)
    setPlaytest({ library, hand, battlefield: [], graveyard: [] })
    setActiveSection('playtest')
  }

  const drawCard = () => {
    if (!playtest || playtest.library.length === 0) return
    const [top, ...rest] = playtest.library
    setPlaytest({ ...playtest, library: rest, hand: [...playtest.hand, top] })
  }

  const mulligan = () => {
    if (!playtest) return
    const back = [...playtest.hand, ...playtest.library]
    const library = shuffle(back)
    const hand = library.splice(0, 7)
    setPlaytest({ ...playtest, library, hand, battlefield: [], graveyard: [] })
  }

  const playFromHand = (name: string) => {
    if (!playtest) return
    setPlaytest({
      ...playtest,
      hand: playtest.hand.filter((c) => c !== name),
      battlefield: [...playtest.battlefield, name],
    })
  }

  const [upgradeList, setUpgradeList] = useState<UpgradeRecommendation[]>([])
  useEffect(() => {
    if (!analysis || !cardDbReady) {
      setUpgradeList([])
      return
    }
    loadCardDatabase().then((db) => {
      setUpgradeList(
        suggestUpgradesLocal(
          analysis,
          db.cards,
          bracket,
          Math.max(5, budget / 15),
        ),
      )
    })
  }, [analysis, bracket, budget, cardDbReady])

  const beatTips = analysis ? howToBeat(analysis) : []

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await saveDecklist(
        saveName.trim() || analysis?.commander?.name || 'My deck',
        text,
        analysis?.commander?.name,
      )
      setSaveName('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
          Upload Decklist
        </h2>
        <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
          Paste your 99-card maindeck, then put your commander as the last line.
        </p>
        {cardDbReady && (
          <p className="text-xs text-[var(--color-mtg-muted)]">
            {cardDbCount.toLocaleString()} cards loaded
          </p>
        )}

        <textarea
          value={text}
          onChange={(e) => updateText(e.target.value)}
          rows={14}
          placeholder={'1 Sol Ring\n1 Command Tower\n1 Arcane Signet\n...\n1 Atraxa, Praetors\' Voice'}
          className="mt-4 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 font-mono text-xs"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={analyze}
            disabled={loading || !text.trim()}
            className="rounded-lg bg-[var(--color-mtg-gold)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Analyze Deck'}
          </button>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Deck name to save"
            className="rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="rounded-lg border border-[var(--color-mtg-gold)] px-4 py-2 text-sm text-[var(--color-mtg-gold)] hover:bg-[var(--color-mtg-gold)]/10 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save to account'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      {analysis && (
        <>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['overview', 'Overview'],
                ['playtest', 'Playtest'],
                ['upgrades', 'Upgrades'],
                ['beat', 'How to Beat'],
                ['feedback', 'Feedback'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  activeSection === id
                    ? 'bg-[var(--color-mtg-gold)] text-black'
                    : 'border border-[var(--color-mtg-border)] text-[var(--color-mtg-muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeSection === 'overview' && (
            <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
              <div className="flex flex-wrap gap-6">
                {analysis.commander?.card && (
                  <img
                    src={cardImage(analysis.commander.card)}
                    alt={analysis.commander.name}
                    className="w-36 rounded-lg shadow-lg"
                  />
                )}
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-[var(--color-mtg-muted)]">Commander:</span>{' '}
                    {analysis.commander?.name ?? '—'}
                  </p>
                  <p>
                    <span className="text-[var(--color-mtg-muted)]">Cards:</span> {analysis.totalCards}
                  </p>
                  <p>
                    <span className="text-[var(--color-mtg-muted)]">Identity:</span>{' '}
                    {analysis.colorIdentity.join('') || 'Colorless'}
                  </p>
                  <p>
                    <span className="text-[var(--color-mtg-muted)]">Avg CMC:</span>{' '}
                    {analysis.avgCmc.toFixed(2)}
                  </p>
                  <p>
                    <span className="text-[var(--color-mtg-muted)]">Est. value:</span> $
                    {analysis.totalUsd.toFixed(2)}
                  </p>
                </div>
              </div>

              {analysis.issues.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-red-400">
                  {analysis.issues.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              )}
              {analysis.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-amber-400">
                  {analysis.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={startPlaytest}
                className="mt-4 rounded-lg border border-[var(--color-mtg-gold)] px-4 py-2 text-sm text-[var(--color-mtg-gold)] hover:bg-[var(--color-mtg-gold)]/10"
              >
                Start Goldfish Playtest
              </button>
            </section>
          )}

          {activeSection === 'playtest' && playtest && (
            <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
              <p className="text-sm text-[var(--color-mtg-muted)]">
                Solo goldfish: draw, mulligan, play cards from hand. Library: {playtest.library.length} · Hand: {playtest.hand.length}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={drawCard} className="rounded bg-[var(--color-mtg-gold)] px-3 py-1 text-sm text-black">
                  Draw
                </button>
                <button type="button" onClick={mulligan} className="rounded border border-[var(--color-mtg-border)] px-3 py-1 text-sm">
                  Mulligan to 7
                </button>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Hand</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {playtest.hand.map((name, i) => (
                    <li key={`${name}-${i}`}>
                      <button
                        type="button"
                        onClick={() => playFromHand(name)}
                        className="rounded border border-[var(--color-mtg-border)] px-2 py-1 text-xs hover:border-[var(--color-mtg-gold)]"
                      >
                        Play {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Battlefield</h3>
                <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
                  {playtest.battlefield.length ? playtest.battlefield.join(', ') : 'Empty'}
                </p>
              </div>
            </section>
          )}

          {activeSection === 'upgrades' && (
            <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5 space-y-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-sm text-[var(--color-mtg-muted)]">Bracket</label>
                  <select
                    value={bracket}
                    onChange={(e) => setBracket(Number(e.target.value) as Bracket)}
                    className="mt-1 block rounded border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((b) => (
                      <option key={b} value={b}>
                        Bracket {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[var(--color-mtg-muted)]">Budget (USD)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="mt-1 block w-32 rounded border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <UpgradeSuggestions
                upgrades={upgradeList}
                loading={!cardDbReady && !!analysis}
              />
            </section>
          )}

          {activeSection === 'beat' && (
            <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5 space-y-4">
              {beatTips.map((block) => (
                <div key={block.title}>
                  <h3 className="font-semibold text-[var(--color-mtg-gold)]">{block.title}</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-mtg-muted)]">
                    {block.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {activeSection === 'feedback' && (
            <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
              <p className="text-sm text-[var(--color-mtg-muted)]">
                Notes for your playgroup or future tuning (saved locally in this session).
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                placeholder="What felt weak? What overperformed?"
                className="mt-3 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
