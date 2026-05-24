/** Shared EDHREC commander rank helpers for build scripts. */

export function commanderSlug(name) {
  const base = name.split('//')[0].trim()
  return base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function latestRankFromPanel(rankOverTime) {
  if (!rankOverTime || typeof rankOverTime !== 'object') return null
  const dates = Object.keys(rankOverTime).sort()
  if (dates.length === 0) return null
  const entry = rankOverTime[dates[dates.length - 1]]
  const rank = entry?.rank ?? entry?.rank_ma
  return typeof rank === 'number' && rank > 0 ? rank : null
}

export async function fetchEdhrecCommanderMeta(name) {
  const slug = commanderSlug(name)
  if (!slug) return null

  const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CommanderHelper/1.0 (build script)',
    },
  })
  if (!res.ok) return null

  const data = await res.json()
  const rank = latestRankFromPanel(data.panels?.rank_over_time)
  const numDecks =
    typeof data.num_decks_avg === 'number' && data.num_decks_avg > 0
      ? data.num_decks_avg
      : null

  return { rank, numDecks, slug }
}

export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}
