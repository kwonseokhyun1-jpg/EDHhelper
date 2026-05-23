/**
 * Downloads all Commander-legal commanders from Scryfall (build-time only).
 * Run: npm run build:commanders
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { ARCHETYPES, deriveTags, oracleText } from './tag-definitions.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/data/commanders.json')
const BASE = 'https://api.scryfall.com'

function slim(card) {
  const text = oracleText(card)
  const tags = deriveTags(card)
  const tl = (card.type_line ?? '').toLowerCase()
  if (tl.includes('elf') || tl.includes('goblin') || tl.includes('zombie') || tl.includes('dragon')) {
    if (!tags.includes('tribal')) tags.push('tribal')
  }

  return {
    id: card.id,
    name: card.name,
    color_identity: card.color_identity ?? [],
    mana_cost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost,
    cmc: card.cmc ?? 0,
    type_line: card.type_line ?? card.card_faces?.[0]?.type_line ?? '',
    oracle_text: text,
    keywords: card.keywords ?? [],
    tags,
    image:
      card.image_uris?.normal ??
      card.card_faces?.[0]?.image_uris?.normal,
    scryfall_uri: card.scryfall_uri,
    edhrec_rank: card.edhrec_rank,
    prices: { usd: card.prices?.usd ?? null },
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  let url = `${BASE}/cards/search?q=${encodeURIComponent('is:commander legal:commander')}&unique=cards`
  const raw = []

  console.log('Fetching commanders from Scryfall (build-time only)...')
  while (url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Scryfall ${res.status}`)
    const page = await res.json()
    raw.push(...page.data)
    console.log(`  ${raw.length} cards...`)
    url = page.has_more ? page.next_page : null
    if (url) await sleep(120)
  }

  const byName = new Map()
  for (const card of raw) {
    const key = card.name.toLowerCase()
    if (!byName.has(key)) byName.set(key, slim(card))
  }

  const commanders = [...byName.values()].sort((a, b) =>
    (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999),
  )

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(
    OUT,
    JSON.stringify({
      updated_at: new Date().toISOString(),
      count: commanders.length,
      archetypes: ARCHETYPES.map((a) => ({ id: a.id, aliases: a.aliases })),
      commanders,
    }),
  )

  console.log(`Wrote ${commanders.length} commanders to ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
