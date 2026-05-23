import { usePopularity } from '../context/PopularityContext'
import { formatPopularityRank } from '../lib/edhrec'

type Props = {
  rank?: number
  className?: string
}

export function PopularityBadge({ rank, className = '' }: Props) {
  const { showPopularity } = usePopularity()
  const formatted = formatPopularityRank(rank)
  if (!showPopularity || !formatted) return null

  return (
    <span
      className={`inline-flex items-center rounded border border-emerald-700/40 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] text-emerald-300 ${className}`}
    >
      {formatted}
    </span>
  )
}

/** @deprecated use PopularityBadge */
export function EdhrecBadge({ name, rank, className }: { name: string; rank?: number; className?: string }) {
  void name
  return <PopularityBadge rank={rank} className={className} />
}
