import type { ColorChoice } from '../types/mtg'
import { COLOR_LABELS } from '../types/mtg'
import { toggleColorChoice } from '../lib/color-filter'

const COLOR_STYLES: Record<ColorChoice, string> = {
  W: 'bg-[#f8e7b9] text-black border-[#d4c49a]',
  U: 'bg-[#0e68ab] text-white border-[#0a4f82]',
  B: 'bg-[#3d3429] text-[#e6edf3] border-[#1a1510]',
  R: 'bg-[#d3202a] text-white border-[#a01820]',
  G: 'bg-[#00733e] text-white border-[#005a30]',
  C: 'bg-[#9ca3af] text-black border-[#6b7280]',
}

const COLOR_ORDER: ColorChoice[] = ['W', 'U', 'B', 'R', 'G', 'C']

type Props = {
  selected: ColorChoice[]
  onChange: (colors: ColorChoice[]) => void
  label?: string
}

export function ColorPicker({ selected, onChange, label = 'Colors (optional)' }: Props) {
  return (
    <div>
      <p className="mb-2 text-sm text-[var(--color-mtg-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {COLOR_ORDER.map((c) => {
          const active = selected.includes(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(toggleColorChoice(selected, c))}
              title={COLOR_LABELS[c]}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-all ${COLOR_STYLES[c]} ${
                active
                  ? 'ring-2 ring-[var(--color-mtg-gold)] ring-offset-2 ring-offset-[var(--color-mtg-bg)] scale-110'
                  : 'opacity-40 hover:opacity-70'
              }`}
            >
              {c}
            </button>
          )
        })}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-1 rounded-md border border-[var(--color-mtg-border)] px-3 text-xs text-[var(--color-mtg-muted)] hover:text-white"
          >
            Clear
          </button>
        )}
      </div>
      {selected.includes('C') && selected.length === 1 && (
        <p className="mt-1 text-[10px] text-[var(--color-mtg-muted)]">
          Colorless only — cards with no color identity
        </p>
      )}
      {selected.some((c) => c !== 'C') && (
        <p className="mt-1 text-[10px] text-[var(--color-mtg-muted)]">
          Exact identity only — W+U shows Azorius commanders, not mono-W, mono-U, or three-color
        </p>
      )}
    </div>
  )
}
