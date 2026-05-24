import { useState } from 'react'

type Player = {
  id: string
  name: string
  life: number
  poison: number
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export function LifeCounter() {
  const [startingLife, setStartingLife] = useState(40)
  const [commanderDamageLimit, setCommanderDamageLimit] = useState(21)
  const [players, setPlayers] = useState<Player[]>([
    { id: uid(), name: 'Player 1', life: 40, poison: 0 },
    { id: uid(), name: 'Player 2', life: 40, poison: 0 },
    { id: uid(), name: 'Player 3', life: 40, poison: 0 },
    { id: uid(), name: 'Player 4', life: 40, poison: 0 },
  ])
  const [cmdDamage, setCmdDamage] = useState<Record<string, Record<string, number>>>({})

  const addPlayer = () => {
    const n = players.length + 1
    setPlayers([
      ...players,
      { id: uid(), name: `Player ${n}`, life: startingLife, poison: 0 },
    ])
  }

  const removePlayer = (id: string) => {
    if (players.length <= 2) return
    setPlayers(players.filter((p) => p.id !== id))
    setCmdDamage((prev) => {
      const next = { ...prev }
      delete next[id]
      for (const from of Object.keys(next)) {
        delete next[from][id]
      }
      return next
    })
  }

  const adjustLife = (id: string, delta: number) => {
    setPlayers(
      players.map((p) =>
        p.id === id ? { ...p, life: Math.max(0, p.life + delta) } : p,
      ),
    )
  }

  const adjustPoison = (id: string, delta: number) => {
    setPlayers(
      players.map((p) =>
        p.id === id ? { ...p, poison: Math.max(0, Math.min(10, p.poison + delta)) } : p,
      ),
    )
  }

  const adjustCmdDamage = (fromId: string, toId: string, delta: number) => {
    if (fromId === toId) return
    setCmdDamage((prev) => {
      const row = { ...(prev[fromId] ?? {}) }
      const current = row[toId] ?? 0
      row[toId] = Math.max(0, current + delta)
      return { ...prev, [fromId]: row }
    })
    if (delta > 0) {
      setPlayers(
        players.map((p) =>
          p.id === toId ? { ...p, life: Math.max(0, p.life - delta) } : p,
        ),
      )
    } else if (delta < 0) {
      setPlayers(
        players.map((p) =>
          p.id === toId ? { ...p, life: p.life - delta } : p,
        ),
      )
    }
  }

  const resetAll = () => {
    setPlayers(
      players.map((p) => ({
        ...p,
        life: startingLife,
        poison: 0,
      })),
    )
    setCmdDamage({})
  }

  const applyStartingLife = () => {
    setPlayers(players.map((p) => ({ ...p, life: startingLife, poison: 0 })))
    setCmdDamage({})
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
          Life Counter
        </h2>
        <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
          Commander damage tracked per opponent. Damage to a player also reduces their life.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <label className="text-[var(--color-mtg-muted)]">Starting life</label>
            <input
              type="number"
              value={startingLife}
              onChange={(e) => setStartingLife(Number(e.target.value))}
              className="mt-1 block w-24 rounded border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-2 py-1"
            />
          </div>
          <div>
            <label className="text-[var(--color-mtg-muted)]">CMD damage to lose</label>
            <input
              type="number"
              value={commanderDamageLimit}
              onChange={(e) => setCommanderDamageLimit(Number(e.target.value))}
              className="mt-1 block w-24 rounded border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-2 py-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={applyStartingLife}
              className="rounded border border-[var(--color-mtg-border)] px-3 py-1 hover:border-[var(--color-mtg-gold)]"
            >
              Apply to all
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded border border-[var(--color-mtg-border)] px-3 py-1 hover:border-[var(--color-mtg-gold)]"
            >
              Reset game
            </button>
            <button
              type="button"
              onClick={addPlayer}
              className="rounded bg-[var(--color-mtg-gold)] px-3 py-1 text-black"
            >
              + Player
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {players.map((player) => {
          const lethalCmd = players.some((from) => {
            const dmg = cmdDamage[from.id]?.[player.id] ?? 0
            return from.id !== player.id && dmg >= commanderDamageLimit
          })

          return (
            <div
              key={player.id}
              className={`rounded-xl border p-4 ${
                player.life <= 0 || player.poison >= 10 || lethalCmd
                  ? 'border-red-500/60 bg-red-950/20'
                  : 'border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) =>
                    setPlayers(
                      players.map((p) =>
                        p.id === player.id ? { ...p, name: e.target.value } : p,
                      ),
                    )
                  }
                  className="bg-transparent font-semibold outline-none"
                />
                {players.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePlayer(player.id)}
                    className="text-xs text-[var(--color-mtg-muted)] hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustLife(player.id, -1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-mtg-border)] text-xl hover:bg-white/5"
                >
                  −
                </button>
                <span
                  className={`min-w-[4rem] text-center text-4xl font-bold ${
                    player.life <= 0 ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {player.life}
                </span>
                <button
                  type="button"
                  onClick={() => adjustLife(player.id, 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-mtg-border)] text-xl hover:bg-white/5"
                >
                  +
                </button>
              </div>

              <div className="mt-3 flex justify-center gap-2">
                {[-5, -10, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => adjustLife(player.id, d)}
                    className="rounded border border-[var(--color-mtg-border)] px-2 py-0.5 text-xs"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-[var(--color-mtg-muted)]">Poison</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => adjustPoison(player.id, -1)} className="px-2">−</button>
                  <span className={player.poison >= 10 ? 'text-red-400 font-bold' : ''}>
                    {player.poison}
                  </span>
                  <button type="button" onClick={() => adjustPoison(player.id, 1)} className="px-2">+</button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-[var(--color-mtg-muted)]">Commander damage received</p>
                <ul className="mt-2 space-y-1">
                  {players
                    .filter((p) => p.id !== player.id)
                    .map((from) => {
                      const dmg = cmdDamage[from.id]?.[player.id] ?? 0
                      const lethal = dmg >= commanderDamageLimit
                      return (
                        <li
                          key={from.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className={lethal ? 'text-red-400' : ''}>
                            from {from.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => adjustCmdDamage(from.id, player.id, -1)}
                              className="px-1.5 border border-[var(--color-mtg-border)] rounded"
                            >
                              −
                            </button>
                            <span className={`w-6 text-center ${lethal ? 'text-red-400 font-bold' : ''}`}>
                              {dmg}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustCmdDamage(from.id, player.id, 1)}
                              className="px-1.5 border border-[var(--color-mtg-border)] rounded"
                            >
                              +
                            </button>
                          </div>
                        </li>
                      )
                    })}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
