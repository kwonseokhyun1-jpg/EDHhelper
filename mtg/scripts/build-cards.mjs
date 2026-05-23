/**
 * Downloads Scryfall oracle bulk data and builds Commander-legal card database.
 * Run: npm run build:cards
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { slimCard, ROLES } from './tag-definitions.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/data/cards.json')
const BASE = 'https://api.scryfall.com'

async function main() {
  console.log('Fetching Scryfall bulk metadata...')
  const meta = await fetch(`${BASE}/bulk-data/oracle-cards`, {
    headers: { Accept: 'application/json' },
  }).then((r) => r.json())

  console.log(`Downloading oracle cards (~${(meta.size / 1e6).toFixed(0)} MB)...`)
  const all = await fetch(meta.download_uri).then((r) => r.json())

  const cards = []
  for (const card of all) {
    const legal = card.legalities?.commander
    if (legal !== 'legal' && legal !== 'restricted') continue
    const type = (card.type_line ?? '').toLowerCase()
    if (type.includes('token') || type.includes('emblem')) continue
    if (card.layout === 'art_series' || card.layout === 'token') continue
    cards.push(slimCard(card))
  }

  const byName = new Map()
  for (const c of cards) {
    const key = c.name.toLowerCase()
    const existing = byName.get(key)
    if (!existing || (c.edhrec_rank ?? 999999) < (existing.edhrec_rank ?? 999999)) {
      byName.set(key, c)
    }
  }

  const unique = [...byName.values()].sort((a, b) =>
    (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999),
  )

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(
    OUT,
    JSON.stringify({
      updated_at: new Date().toISOString(),
      count: unique.length,
      roles: ROLES.map((r) => ({ id: r.id, label: r.label })),
      cards: unique,
    }),
  )

  console.log(`Wrote ${unique.length} Commander-legal cards to ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
