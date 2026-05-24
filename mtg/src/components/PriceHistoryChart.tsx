import type { PriceSnapshot } from '../lib/price-history'

type Props = {
  history: PriceSnapshot[]
  currentPrice?: number
  loading?: boolean
  error?: string | null
  tcgplayerUrl?: string
}

function formatAxisPrice(value: number): string {
  if (value >= 100) return `$${value.toFixed(0)}`
  if (value >= 10) return `$${value.toFixed(1)}`
  return `$${value.toFixed(2)}`
}

export function PriceHistoryChart({
  history,
  currentPrice,
  loading,
  error,
  tcgplayerUrl,
}: Props) {
  if (loading) {
    return (
      <p className="animate-pulse text-xs text-[var(--color-mtg-muted)]">
        Loading TCGPlayer price history…
      </p>
    )
  }

  if (error) {
    return (
      <div className="space-y-1 text-xs text-[var(--color-mtg-muted)]">
        <p className="text-red-400/90">{error}</p>
        {tcgplayerUrl && (
          <a
            href={tcgplayerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-mtg-gold)] underline"
          >
            View on TCGPlayer
          </a>
        )}
      </div>
    )
  }

  const points =
    history.length > 0
      ? history
      : currentPrice != null && currentPrice > 0
        ? [{ date: new Date().toISOString().slice(0, 10), usd: currentPrice }]
        : []

  if (points.length === 0) {
    return (
      <p className="text-xs text-[var(--color-mtg-muted)]">
        No TCGPlayer price history available for this printing.
      </p>
    )
  }

  const width = 360
  const height = 140
  const pad = { top: 10, right: 12, bottom: 26, left: 44 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const prices = points.map((p) => p.usd)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const yTicks = [min, min + range / 2, max]

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? pad.left + innerW / 2
        : pad.left + (i / (points.length - 1)) * innerW
    const y = pad.top + innerH - ((p.usd - min) / range) * innerH
    return { x, y, ...p }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`
      : ''

  const firstDate = points[0].date
  const lastDate = points[points.length - 1].date
  const last = coords[coords.length - 1]

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-xs text-[var(--color-mtg-muted)]">
        <span>TCGPlayer market price — last 6 months</span>
        <span>
          ${min.toFixed(2)} – ${max.toFixed(2)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)]"
        role="img"
        aria-label="TCGPlayer six month price history chart"
      >
        {yTicks.map((tick) => {
          const y = pad.top + innerH - ((tick - min) / range) * innerH
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + innerW}
                y2={y}
                stroke="var(--color-mtg-border)"
                strokeWidth="0.5"
                strokeDasharray="2 3"
                opacity="0.6"
              />
              <text
                x={pad.left - 4}
                y={y + 3}
                fill="var(--color-mtg-muted)"
                fontSize="8"
                textAnchor="end"
              >
                {formatAxisPrice(tick)}
              </text>
            </g>
          )
        })}

        <line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={pad.left + innerW}
          y2={pad.top + innerH}
          stroke="var(--color-mtg-border)"
          strokeWidth="1"
        />

        {areaPath && (
          <path d={areaPath} fill="var(--color-mtg-gold)" fillOpacity="0.08" />
        )}

        {coords.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-mtg-gold)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {coords.length === 1 && (
          <circle cx={last.x} cy={last.y} r="2" fill="var(--color-mtg-gold)" />
        )}

        {coords.length > 1 && (
          <circle
            cx={last.x}
            cy={last.y}
            r="2.5"
            fill="var(--color-mtg-gold)"
            stroke="var(--color-mtg-bg)"
            strokeWidth="1"
          />
        )}

        <text x={pad.left} y={height - 6} fill="var(--color-mtg-muted)" fontSize="8">
          {firstDate}
        </text>
        {points.length > 1 && (
          <text
            x={pad.left + innerW}
            y={height - 6}
            fill="var(--color-mtg-muted)"
            fontSize="8"
            textAnchor="end"
          >
            {lastDate}
          </text>
        )}
      </svg>
      {tcgplayerUrl && (
        <a
          href={tcgplayerUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-[var(--color-mtg-gold)] underline"
        >
          Source: TCGPlayer
        </a>
      )}
    </div>
  )
}
