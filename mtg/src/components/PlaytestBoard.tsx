import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import type { DeckAnalysis } from '../types/mtg'
import { searchCards, cardImage } from '../api/scryfall'
import { getCardByNameLocal, loadCardDatabase } from '../lib/card-db'
import { resolveCardNameFuzzy } from '../lib/card-name-resolve'

export type PlaytestCard = {
  uid: string
  name: string
  image?: string
  isToken?: boolean
  isCommander?: boolean
  tapped?: boolean
}

export type BattlefieldCard = PlaytestCard & {
  x: number
  y: number
}

type PlaytestZone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command'

type PlaytestState = {
  library: PlaytestCard[]
  hand: PlaytestCard[]
  battlefield: BattlefieldCard[]
  graveyard: PlaytestCard[]
  exile: PlaytestCard[]
  command: PlaytestCard[]
  tokens: number
  turn: number
}

type SelectedCard = {
  zone: PlaytestZone
  index: number
  uid: string
}

type DragPayload = {
  zone: PlaytestZone
  index: number
  uid?: string
}

type CollapsibleZone = 'library' | 'graveyard' | 'exile'

const PLAYTEST_SHORTCUTS = [
  { key: 'D', action: 'Draw a card from your library' },
  { key: 'S', action: 'Shuffle your library' },
  { key: 'T', action: 'Next turn — untap all permanents and draw a card' },
  { key: 'E', action: 'Move selected card to exile' },
  { key: 'G', action: 'Move selected card to graveyard' },
  { key: 'Double-click', action: 'Tap or untap a card' },
  { key: 'Click', action: 'Select a card (highlighted border) for E / G shortcuts' },
  { key: 'Drag', action: 'Move cards between zones or reposition on the battlefield' },
] as const

const TOKEN_PRESETS = [
  'Treasure Token',
  'Clue Token',
  'Food Token',
  'Soldier Token',
  'Zombie Token',
  'Goblin Token',
  'Elf Warrior Token',
  'Spirit Token',
]

let playtestUid = 0

function newPlaytestUid(): string {
  playtestUid += 1
  return `pt-${Date.now()}-${playtestUid}`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toPlaytestCard(
  name: string,
  opts?: { isCommander?: boolean; isToken?: boolean; image?: string },
): PlaytestCard {
  const local = getCardByNameLocal(name) ?? resolveCardNameFuzzy(name)
  return {
    uid: newPlaytestUid(),
    name: local?.name ?? name,
    image: opts?.image ?? local?.image,
    isCommander: opts?.isCommander,
    isToken: opts?.isToken,
    tapped: false,
  }
}

function parseDragPayload(data: string): DragPayload | null {
  try {
    const parsed = JSON.parse(data) as DragPayload
    if (parsed?.zone && typeof parsed.index === 'number') return parsed
  } catch {
    /* ignore */
  }
  return null
}

function stripBattlefield(card: BattlefieldCard): PlaytestCard {
  const { x: _x, y: _y, ...rest } = card
  return rest
}

function applyZoneMove(
  state: PlaytestState,
  from: PlaytestZone,
  fromIndex: number,
  to: PlaytestZone,
  bfPos?: { x: number; y: number },
): PlaytestState {
  if (from === to && to !== 'battlefield') return state

  const source = [...state[from]] as PlaytestCard[]
  const [raw] = source.splice(fromIndex, 1)
  if (!raw) return state

  if (raw.isToken && to !== 'battlefield') {
    return { ...state, [from]: source as PlaytestState[typeof from] }
  }

  if (to === 'battlefield') {
    const pos = bfPos ?? { x: 40 + state.battlefield.length * 24, y: 40 }
    const bfCard: BattlefieldCard = { ...raw, x: pos.x, y: pos.y, tapped: raw.tapped ?? false }
    return {
      ...state,
      [from]: source as PlaytestState[typeof from],
      battlefield: [...state.battlefield, bfCard],
    }
  }

  const dest = [...state[to], raw]
  return {
    ...state,
    [from]: source as PlaytestState[typeof from],
    [to]: dest,
  }
}

type Props = {
  analysis: DeckAnalysis
  playtest: PlaytestState | null
  onPlaytestChange: (state: PlaytestState | null) => void
}

export function PlaytestBoard({ analysis, playtest, onPlaytestChange }: Props) {
  const [dragOverZone, setDragOverZone] = useState<PlaytestZone | null>(null)
  const [expandedZones, setExpandedZones] = useState<Set<CollapsibleZone>>(new Set())
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [tutorModalOpen, setTutorModalOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedCard | null>(null)
  const [tutorSearch, setTutorSearch] = useState('')
  const [tokenSearch, setTokenSearch] = useState('')
  const [tokenCustomName, setTokenCustomName] = useState('')
  const [tokenResults, setTokenResults] = useState<Array<{ name: string; image?: string }>>([])
  const [tokenSearching, setTokenSearching] = useState(false)
  const bfRef = useRef<HTMLDivElement>(null)
  const tokenSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startPlaytest = async () => {
    await loadCardDatabase()
    const cards: PlaytestCard[] = []
    for (const c of analysis.cards) {
      if (!c.card) continue
      for (let i = 0; i < c.quantity; i++) {
        cards.push(toPlaytestCard(c.name))
      }
    }
    const library = shuffle(cards)
    const hand = library.splice(0, 7)
    const command = analysis.commander?.name
      ? [toPlaytestCard(analysis.commander.name, { isCommander: true })]
      : []

    onPlaytestChange({
      library,
      hand,
      battlefield: [],
      graveyard: [],
      exile: [],
      command,
      tokens: 0,
      turn: 1,
    })
    setSelected(null)
  }

  const drawCard = useCallback(() => {
    if (!playtest || playtest.library.length === 0) return
    const [top, ...rest] = playtest.library
    onPlaytestChange({ ...playtest, library: rest, hand: [...playtest.hand, top] })
  }, [playtest, onPlaytestChange])

  const shuffleLibrary = useCallback(() => {
    if (!playtest || playtest.library.length === 0) return
    onPlaytestChange({ ...playtest, library: shuffle(playtest.library) })
  }, [playtest, onPlaytestChange])

  const untapAll = useCallback(() => {
    if (!playtest) return
    onPlaytestChange({
      ...playtest,
      battlefield: playtest.battlefield.map((c) => ({ ...c, tapped: false })),
      command: playtest.command.map((c) => ({ ...c, tapped: false })),
      hand: playtest.hand.map((c) => ({ ...c, tapped: false })),
    })
  }, [playtest, onPlaytestChange])

  const nextTurn = useCallback(() => {
    if (!playtest) return
    const untapped = {
      ...playtest,
      turn: (playtest.turn ?? 1) + 1,
      battlefield: playtest.battlefield.map((c) => ({ ...c, tapped: false })),
      command: playtest.command.map((c) => ({ ...c, tapped: false })),
      hand: playtest.hand.map((c) => ({ ...c, tapped: false })),
    }
    if (untapped.library.length === 0) {
      onPlaytestChange(untapped)
      return
    }
    const [top, ...rest] = untapped.library
    onPlaytestChange({ ...untapped, library: rest, hand: [...untapped.hand, top] })
  }, [playtest, onPlaytestChange])

  const moveSelectedTo = useCallback(
    (to: 'exile' | 'graveyard') => {
      if (!playtest || !selected) return
      const zone = selected.zone
      const list = playtest[zone] as PlaytestCard[]
      const card = list[selected.index]
      if (!card || card.uid !== selected.uid) {
        setSelected(null)
        return
      }
      if (card.isToken && zone === 'battlefield') {
        onPlaytestChange({
          ...playtest,
          battlefield: playtest.battlefield.filter((c) => c.uid !== card.uid),
        })
      } else {
        onPlaytestChange(applyZoneMove(playtest, zone, selected.index, to))
      }
      setSelected(null)
    },
    [playtest, selected, onPlaytestChange],
  )

  const selectCard = (zone: PlaytestZone, index: number, uid: string) => {
    setSelected((prev) =>
      prev?.uid === uid ? null : { zone, index, uid },
    )
  }

  const isSelected = (zone: PlaytestZone, uid: string) =>
    selected?.zone === zone && selected.uid === uid

  useEffect(() => {
    if (!playtest) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        drawCard()
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        shuffleLibrary()
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        nextTurn()
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        moveSelectedTo('exile')
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        moveSelectedTo('graveyard')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playtest, drawCard, shuffleLibrary, nextTurn, moveSelectedTo])

  const mulligan = () => {
    if (!playtest) return
    const back = [
      ...playtest.hand,
      ...playtest.library,
      ...playtest.battlefield.filter((c) => !c.isToken).map(stripBattlefield),
      ...playtest.graveyard.filter((c) => !c.isToken),
      ...playtest.exile.filter((c) => !c.isToken),
    ]
    const library = shuffle(back)
    const hand = library.splice(0, 5)
    onPlaytestChange({
      ...playtest,
      library,
      hand,
      battlefield: playtest.battlefield.filter((c) => c.isToken),
      graveyard: playtest.graveyard.filter((c) => !c.isToken),
      exile: playtest.exile.filter((c) => !c.isToken),
      turn: 1,
    })
    setSelected(null)
  }

  const toggleExpanded = (zone: CollapsibleZone) => {
    setExpandedZones((prev) => {
      const next = new Set(prev)
      if (next.has(zone)) next.delete(zone)
      else next.add(zone)
      return next
    })
  }

  const toggleTap = (zone: PlaytestZone, index: number) => {
    if (!playtest) return
    if (zone === 'battlefield') {
      const bf = [...playtest.battlefield]
      const card = bf[index]
      if (!card) return
      bf[index] = { ...card, tapped: !card.tapped }
      onPlaytestChange({ ...playtest, battlefield: bf })
      return
    }
    const list = [...playtest[zone]] as PlaytestCard[]
    const card = list[index]
    if (!card) return
    list[index] = { ...card, tapped: !card.tapped }
    onPlaytestChange({ ...playtest, [zone]: list })
  }

  const bfDropPosition = (e: DragEvent): { x: number; y: number } => {
    const rect = bfRef.current?.getBoundingClientRect()
    if (!rect) return { x: 40, y: 40 }
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left - 32, rect.width - 64)),
      y: Math.max(0, Math.min(e.clientY - rect.top - 44, rect.height - 88)),
    }
  }

  const handleZoneDrop = (toZone: PlaytestZone, e: DragEvent, bfPos?: { x: number; y: number }) => {
    e.preventDefault()
    setDragOverZone(null)
    const payload = parseDragPayload(e.dataTransfer.getData('text/plain'))
    if (!payload || !playtest) return

    if (toZone === 'battlefield' && payload.zone === 'battlefield') {
      const pos = bfPos ?? bfDropPosition(e)
      const bf = playtest.battlefield.map((c, i) =>
        i === payload.index ? { ...c, x: pos.x, y: pos.y } : c,
      )
      onPlaytestChange({ ...playtest, battlefield: bf })
      return
    }

    onPlaytestChange(applyZoneMove(playtest, payload.zone, payload.index, toZone, bfPos))
  }

  const handleZoneDragOver = (zone: PlaytestZone, e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverZone(zone)
  }

  const tutorFromLibrary = (uid: string) => {
    if (!playtest) return
    const idx = playtest.library.findIndex((c) => c.uid === uid)
    if (idx === -1) return
    const card = playtest.library[idx]
    const library = playtest.library.filter((_, i) => i !== idx)
    onPlaytestChange({ ...playtest, library, hand: [...playtest.hand, card] })
    setTutorModalOpen(false)
    setTutorSearch('')
  }

  const filteredLibraryForTutor = playtest
    ? playtest.library.filter((c) =>
        c.name.toLowerCase().includes(tutorSearch.trim().toLowerCase()),
      )
    : []

  const addTokenToBattlefield = (name: string, image?: string) => {
    if (!playtest) return
    const n = playtest.tokens + 1
    const pos = { x: 60 + (n % 8) * 70, y: 60 + Math.floor(n / 8) * 100 }
    onPlaytestChange({
      ...playtest,
      tokens: n,
      battlefield: [
        ...playtest.battlefield,
        { ...toPlaytestCard(name, { isToken: true, image }), ...pos },
      ],
    })
    setTokenModalOpen(false)
    setTokenSearch('')
    setTokenCustomName('')
    setTokenResults([])
  }

  useEffect(() => {
    if (!tokenModalOpen) return
    if (tokenSearchTimer.current) clearTimeout(tokenSearchTimer.current)
    if (tokenSearch.trim().length < 2) {
      setTokenResults([])
      return
    }
    tokenSearchTimer.current = setTimeout(async () => {
      setTokenSearching(true)
      try {
        const res = await searchCards(`is:token ${tokenSearch}`, { unique: 'cards' })
        setTokenResults(
          res.data.slice(0, 10).map((c) => ({ name: c.name, image: cardImage(c) })),
        )
      } catch {
        setTokenResults([])
      } finally {
        setTokenSearching(false)
      }
    }, 350)
    return () => {
      if (tokenSearchTimer.current) clearTimeout(tokenSearchTimer.current)
    }
  }, [tokenSearch, tokenModalOpen])

  function CardFace({
    card,
    size = 'md',
    onDoubleClick,
    selected = false,
  }: {
    card: PlaytestCard
    size?: 'sm' | 'md'
    onDoubleClick?: () => void
    selected?: boolean
  }) {
    const width = size === 'sm' ? 'w-12' : 'w-16'
    return (
      <div
        className={`${width} shrink-0 transition-transform ${card.tapped ? 'rotate-90' : ''} ${selected ? 'ring-2 ring-sky-400 rounded' : ''}`}
        onDoubleClick={onDoubleClick}
      >
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            className={`${width} rounded shadow ${card.isCommander ? 'ring-2 ring-[var(--color-mtg-gold)]' : ''} ${card.tapped ? 'opacity-80' : ''}`}
            draggable={false}
          />
        ) : (
          <div
            className={`flex aspect-[488/680] ${width} items-center justify-center rounded border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] p-1 text-center text-[8px] leading-tight ${card.isCommander ? 'ring-2 ring-[var(--color-mtg-gold)]' : ''}`}
          >
            {card.name}
          </div>
        )}
      </div>
    )
  }

  function DraggableCard({
    card,
    zone,
    index,
  }: {
    card: PlaytestCard
    zone: Exclude<PlaytestZone, 'battlefield'>
    index: number
  }) {
    const selectedCard = isSelected(zone, card.uid)
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            'text/plain',
            JSON.stringify({ zone, index } satisfies DragPayload),
          )
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => setDragOverZone(null)}
        onClick={() => selectCard(zone, index, card.uid)}
        onDoubleClick={() => toggleTap(zone, index)}
        className={`cursor-grab text-left transition hover:scale-105 active:cursor-grabbing ${selectedCard ? 'scale-105' : ''}`}
        title={`${card.name} · click to select · double-click to tap · E exile · G graveyard`}
      >
        <CardFace card={card} selected={selectedCard} />
        <p className="mt-1 max-w-[4rem] truncate text-[10px]">{card.name}</p>
      </div>
    )
  }

  function CollapsibleZonePanel({
    zone,
    label,
    cards,
  }: {
    zone: CollapsibleZone
    label: string
    cards: PlaytestCard[]
  }) {
    const expanded = expandedZones.has(zone)
    const isOver = dragOverZone === zone
    return (
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => toggleExpanded(zone)}
          onDragOver={(e) => handleZoneDragOver(zone, e)}
          onDragLeave={() => setDragOverZone((z) => (z === zone ? null : z))}
          onDrop={(e) => handleZoneDrop(zone, e)}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition ${
            isOver
              ? 'border-[var(--color-mtg-gold)] bg-[var(--color-mtg-gold)]/10'
              : 'border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)]/60 hover:border-[var(--color-mtg-gold-dim)]'
          }`}
        >
          <span className="font-semibold text-[var(--color-mtg-muted)]">{label}</span>
          <span className="text-[var(--color-mtg-gold)]">{cards.length}</span>
          <span className="text-[var(--color-mtg-muted)]">{expanded ? '▾' : '▸'}</span>
        </button>
        {expanded && (
          <div
            onDragOver={(e) => handleZoneDragOver(zone, e)}
            onDrop={(e) => handleZoneDrop(zone, e)}
            className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-dashed border-[var(--color-mtg-border)] p-2"
          >
            {zone === 'library' ? (
              <div className="space-y-2">
                <p className="text-[10px] text-[var(--color-mtg-muted)]">
                  Face-down pile — <kbd className="rounded border px-1">D</kbd> draw ·{' '}
                  <kbd className="rounded border px-1">S</kbd> shuffle
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTutorSearch('')
                    setTutorModalOpen(true)
                  }}
                  disabled={cards.length === 0}
                  className="rounded border border-[var(--color-mtg-gold-dim)] px-2 py-1 text-[10px] text-[var(--color-mtg-gold)] disabled:opacity-40"
                >
                  Tutor for card
                </button>
              </div>
            ) : cards.length === 0 ? (
              <p className="text-[10px] text-[var(--color-mtg-muted)]">Empty</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cards.map((card, i) => (
                  <DraggableCard key={card.uid} card={card} zone={zone} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!playtest) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-mtg-muted)]">
          Solo goldfish with free-form battlefield layout. Use the{' '}
          <span className="text-[var(--color-mtg-gold)]">Help</span> button for keyboard shortcuts.
        </p>
        <button
          type="button"
          onClick={startPlaytest}
          className="rounded-lg bg-[var(--color-mtg-gold)] px-5 py-2 text-sm font-semibold text-black"
        >
          Start Goldfish Playtest
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-mtg-muted)]">
          Turn{' '}
          <span className="font-semibold text-[var(--color-mtg-gold)]">{playtest.turn ?? 1}</span>
          {selected && (
            <span className="ml-2 text-xs text-sky-300">
              · Selected: {playtest[selected.zone][selected.index]?.name}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="rounded border border-[var(--color-mtg-border)] px-2.5 py-1 text-xs text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold)] hover:text-white"
        >
          Help
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={drawCard}
          className="rounded bg-[var(--color-mtg-gold)] px-3 py-1 text-sm text-black"
        >
          Draw
        </button>
        <button
          type="button"
          onClick={nextTurn}
          className="rounded border border-[var(--color-mtg-gold-dim)] px-3 py-1 text-sm text-[var(--color-mtg-gold)]"
        >
          Next turn (T)
        </button>
        <button
          type="button"
          onClick={untapAll}
          className="rounded border border-[var(--color-mtg-border)] px-3 py-1 text-sm"
        >
          Untap all
        </button>
        <button
          type="button"
          onClick={mulligan}
          className="rounded border border-[var(--color-mtg-border)] px-3 py-1 text-sm"
        >
          Mulligan
        </button>
        <button
          type="button"
          onClick={() => setTokenModalOpen(true)}
          className="rounded border border-[var(--color-mtg-gold-dim)] px-3 py-1 text-sm text-[var(--color-mtg-gold)]"
        >
          Create token
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <CollapsibleZonePanel zone="library" label="Library" cards={playtest.library} />
        <CollapsibleZonePanel zone="graveyard" label="Graveyard" cards={playtest.graveyard} />
        <CollapsibleZonePanel zone="exile" label="Exile" cards={playtest.exile} />
      </div>

      <div
        onDragOver={(e) => handleZoneDragOver('command', e)}
        onDragLeave={() => setDragOverZone((z) => (z === 'command' ? null : z))}
        onDrop={(e) => handleZoneDrop('command', e)}
        className={`rounded-lg border border-dashed p-2 transition ${
          dragOverZone === 'command'
            ? 'border-[var(--color-mtg-gold)] bg-[var(--color-mtg-gold)]/10'
            : 'border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)]/40'
        }`}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-mtg-muted)]">
          Command zone ({playtest.command.length})
        </h3>
        <div className="mt-2 flex flex-wrap gap-3">
          {playtest.command.length === 0 ? (
            <p className="text-xs text-[var(--color-mtg-muted)]">Drop commander here</p>
          ) : (
            playtest.command.map((card, i) => (
              <DraggableCard key={card.uid} card={card} zone="command" index={i} />
            ))
          )}
        </div>
      </div>

      <div
        ref={bfRef}
        onDragOver={(e) => handleZoneDragOver('battlefield', e)}
        onDragLeave={() => setDragOverZone((z) => (z === 'battlefield' ? null : z))}
        onDrop={(e) => handleZoneDrop('battlefield', e, bfDropPosition(e))}
        className={`relative min-h-[28rem] rounded-xl border-2 border-dashed transition ${
          dragOverZone === 'battlefield'
            ? 'border-[var(--color-mtg-gold)] bg-[var(--color-mtg-gold)]/5'
            : 'border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)]/30'
        }`}
      >
        <span className="absolute left-3 top-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-mtg-muted)]">
          Battlefield ({playtest.battlefield.length})
        </span>
        {playtest.battlefield.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-mtg-muted)]">
            Drop cards anywhere on the battlefield
          </p>
        )}
        {playtest.battlefield.map((card, i) => {
          const selectedCard = isSelected('battlefield', card.uid)
          return (
          <div
            key={card.uid}
            draggable
            style={{ left: card.x, top: card.y }}
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'text/plain',
                JSON.stringify({ zone: 'battlefield', index: i } satisfies DragPayload),
              )
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => setDragOverZone(null)}
            onClick={() => selectCard('battlefield', i, card.uid)}
            onDoubleClick={() => toggleTap('battlefield', i)}
            className={`absolute cursor-grab active:cursor-grabbing ${selectedCard ? 'z-10 scale-105' : ''}`}
            title={`${card.name} · click to select · double-click to tap · E exile · G graveyard`}
          >
            <CardFace card={card} selected={selectedCard} />
            <p className="mt-0.5 max-w-[4rem] truncate text-center text-[9px]">{card.name}</p>
          </div>
        )})}
      </div>

      <div
        onDragOver={(e) => handleZoneDragOver('hand', e)}
        onDragLeave={() => setDragOverZone((z) => (z === 'hand' ? null : z))}
        onDrop={(e) => handleZoneDrop('hand', e)}
        className={`min-h-[6rem] rounded-lg border border-dashed p-3 transition ${
          dragOverZone === 'hand'
            ? 'border-[var(--color-mtg-gold)] bg-[var(--color-mtg-gold)]/10'
            : 'border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)]/40'
        }`}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-mtg-muted)]">
          Hand ({playtest.hand.length})
        </h3>
        <div className="mt-2 flex flex-wrap gap-3">
          {playtest.hand.length === 0 ? (
            <p className="text-xs text-[var(--color-mtg-muted)]">Empty</p>
          ) : (
            playtest.hand.map((card, i) => (
              <DraggableCard key={card.uid} card={card} zone="hand" index={i} />
            ))
          )}
        </div>
      </div>

      {tutorModalOpen && playtest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5 shadow-xl">
            <h3 className="font-semibold text-[var(--color-mtg-gold)]">Tutor from library</h3>
            <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
              Pick a card from your library to put into your hand.
            </p>
            <input
              type="text"
              value={tutorSearch}
              onChange={(e) => setTutorSearch(e.target.value)}
              placeholder="Filter by name…"
              className="mt-3 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
              autoFocus
            />
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {filteredLibraryForTutor.length === 0 ? (
                <li className="text-xs text-[var(--color-mtg-muted)]">No matching cards in library.</li>
              ) : (
                filteredLibraryForTutor.map((card) => (
                  <li key={card.uid}>
                    <button
                      type="button"
                      onClick={() => tutorFromLibrary(card.uid)}
                      className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left text-sm hover:border-[var(--color-mtg-gold-dim)] hover:bg-[var(--color-mtg-bg)]"
                    >
                      {card.image && (
                        <img src={card.image} alt="" className="h-10 w-7 rounded object-cover" />
                      )}
                      {card.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              onClick={() => {
                setTutorModalOpen(false)
                setTutorSearch('')
              }}
              className="mt-4 w-full rounded-lg border border-[var(--color-mtg-border)] py-2 text-sm text-[var(--color-mtg-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5 shadow-xl">
            <h3 className="font-semibold text-[var(--color-mtg-gold)]">Playtest shortcuts</h3>
            <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
              Click a card to select it, then use keyboard shortcuts. Shortcuts are disabled while typing in a text field.
            </p>
            <ul className="mt-4 space-y-2">
              {PLAYTEST_SHORTCUTS.map((item) => (
                <li key={item.key} className="flex gap-3 text-sm">
                  <kbd className="shrink-0 rounded border border-[var(--color-mtg-border)] px-2 py-0.5 text-xs text-[var(--color-mtg-gold)]">
                    {item.key}
                  </kbd>
                  <span className="text-[var(--color-mtg-muted)]">{item.action}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="mt-4 w-full rounded-lg border border-[var(--color-mtg-border)] py-2 text-sm text-[var(--color-mtg-muted)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {tokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5 shadow-xl">
            <h3 className="font-semibold text-[var(--color-mtg-gold)]">Create token</h3>
            <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
              Search Scryfall tokens or enter a custom name. Tokens vanish if they leave the battlefield.
            </p>

            <div className="mt-3">
              <label className="text-xs text-[var(--color-mtg-muted)]">Search tokens</label>
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder="e.g. Treasure, Clue, Soldier"
                className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
                autoFocus
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {TOKEN_PRESETS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addTokenToBattlefield(name)}
                  className="rounded-full border border-[var(--color-mtg-border)] px-2 py-0.5 text-[10px] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)]"
                >
                  {name.replace(' Token', '')}
                </button>
              ))}
            </div>

            {tokenSearching && (
              <p className="mt-2 text-xs text-[var(--color-mtg-muted)] animate-pulse">Searching…</p>
            )}
            {tokenResults.length > 0 && (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {tokenResults.map((t) => (
                  <li key={t.name}>
                    <button
                      type="button"
                      onClick={() => addTokenToBattlefield(t.name, t.image)}
                      className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left text-sm hover:border-[var(--color-mtg-gold-dim)] hover:bg-[var(--color-mtg-bg)]"
                    >
                      {t.image && (
                        <img src={t.image} alt="" className="h-10 w-7 rounded object-cover" />
                      )}
                      {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-[var(--color-mtg-border)] pt-4">
              <label className="text-xs text-[var(--color-mtg-muted)]">Custom token name</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={tokenCustomName}
                  onChange={(e) => setTokenCustomName(e.target.value)}
                  placeholder="My Custom Token"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!tokenCustomName.trim()}
                  onClick={() => addTokenToBattlefield(tokenCustomName.trim())}
                  className="rounded-lg bg-[var(--color-mtg-gold)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTokenModalOpen(false)}
              className="mt-4 w-full rounded-lg border border-[var(--color-mtg-border)] py-2 text-sm text-[var(--color-mtg-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { PlaytestState }
