/**
 * Downloads all Commander-legal commanders from Scryfall (build-time only).
 * Run: npm run build:commanders
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { ARCHETYPES, deriveTags, oracleText, slimCardFaces } from './tag-definitions.mjs'
import { fetchEdhrecCommanderMeta, mapPool } from './edhrec-commander-ranks.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/data/commanders.json')
const BASE = 'https://api.scryfall.com'

function parseCreatureTypes(typeLine) {
  const parts = (typeLine ?? '').split(/\s*[—–-]\s*/)
  if (parts.length < 2) return []
  return parts[parts.length - 1]
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean)
}

function slim(card) {
  const text = oracleText(card)
  const typeLine = card.type_line ?? card.card_faces?.[0]?.type_line ?? ''
  const creatureTypes = parseCreatureTypes(typeLine)
  const tags = deriveTags(card)

  for (const tribe of creatureTypes) {
    if (!tags.includes(`tribe:${tribe}`)) tags.push(`tribe:${tribe}`)
  }

  const cardFaces = slimCardFaces(card)
  const record = {
    id: card.id,
    name: card.name,
    color_identity: card.color_identity ?? [],
    mana_cost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost,
    cmc: card.cmc ?? 0,
    type_line: typeLine,
    creature_types: creatureTypes,
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
  if (cardFaces) record.card_faces = cardFaces
  return record
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

  const rawCommanders = [...byName.values()]
  console.log(`Fetching EDHREC ranks for ${rawCommanders.length} commanders...`)

  let edhrecUpdated = 0
  const commanders = (
    await mapPool(rawCommanders, 8, async (cmd) => {
      const meta = await fetchEdhrecCommanderMeta(cmd.name)
      if (meta?.rank) {
        edhrecUpdated++
        return { ...cmd, edhrec_rank: meta.rank }
      }
      return cmd
    })
  ).sort((a, b) => (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999))

  console.log(`  EDHREC ranks updated for ${edhrecUpdated}/${rawCommanders.length} commanders`)

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
