/**
 * Downloads Scryfall oracle-cards bulk (~160 MB) and builds Commander card database.
 * Uses oracle-cards (one row per unique card) to avoid OOM from default-cards (~539 MB).
 * Run: npm run build:cards
 */
import { createWriteStream, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { chain } from 'stream-chain'
import { parser } from 'stream-json/parser.js'
import { streamArray } from 'stream-json/streamers/stream-array.js'
import { createReadStream } from 'node:fs'
import { slimCard, ROLES, canonicalCardName } from './tag-definitions.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/data/cards.json')
const BASE = 'https://api.scryfall.com'

function isCommanderLegal(card) {
  const legal = card.legalities?.commander
  if (legal !== 'legal' && legal !== 'restricted' && legal !== 'banned') return false
  const type = (card.type_line ?? '').toLowerCase()
  if (type.includes('token') || type.includes('emblem')) return false
  if (card.layout === 'art_series' || card.layout === 'token') return false
  return true
}

function slimPrinting(card) {
  return {
    id: card.id,
    set: card.set,
    set_name: card.set_name,
    collector_number: String(card.collector_number),
    image:
      card.image_uris?.normal ??
      card.card_faces?.[0]?.image_uris?.normal,
    prices: { usd: card.prices?.usd ?? null },
    scryfall_uri: card.scryfall_uri,
    released_at: card.released_at,
  }
}

function pickPrimary(existing, candidate) {
  if (!existing) return candidate
  const existingRank = existing.edhrec_rank ?? 999999
  const candidateRank = candidate.edhrec_rank ?? 999999
  let chosen = candidateRank < existingRank ? candidate : existing
  if (candidateRank === existingRank && !chosen.image && candidate.image) {
    chosen = { ...chosen, image: candidate.image }
  }
  const ranks = [existing.edhrec_rank, candidate.edhrec_rank].filter(
    (r) => r != null && r > 0,
  )
  if (ranks.length) {
    chosen = { ...chosen, edhrec_rank: Math.min(...ranks) }
  }
  if (candidate.game_changer || existing.game_changer) {
    chosen = { ...chosen, game_changer: true }
  }
  return chosen
}

async function downloadBulk(url, label) {
  const tmpPath = join(tmpdir(), `scryfall-${label}-${Date.now()}.json`)
  console.log(`Downloading to ${tmpPath}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpPath))
  return tmpPath
}

async function processOracleBulk(filePath) {
  const byKey = new Map()
  const setCodes = {}
  let processed = 0

  const stream = chain([
    createReadStream(filePath),
    parser(),
    streamArray(),
  ])

  for await (const { value: card } of stream) {
    processed++
    if (processed % 25000 === 0) {
      console.log(`  …processed ${processed.toLocaleString()} oracle cards`)
    }

    if (!isCommanderLegal(card)) continue

    const displayName = canonicalCardName(card.name)
    const entryKey = card.oracle_id ?? displayName.toLowerCase()
    const set = card.set.toLowerCase()
    setCodes[card.set_name.toLowerCase()] = set
    setCodes[set] = set

    const slim = slimCard(card)
    const printing = slimPrinting(card)
    const existing = byKey.get(entryKey)

    if (!existing) {
      byKey.set(entryKey, { ...slim, printings: [printing] })
      continue
    }

    const primary = pickPrimary(existing, slim)
    const printings = [...(existing.printings ?? [])]
    const printKey = `${printing.set}:${printing.collector_number}`
    if (!printings.some((p) => `${p.set}:${p.collector_number}` === printKey)) {
      printings.push(printing)
    }
    byKey.set(entryKey, { ...primary, printings })
  }

  console.log(`Processed ${processed.toLocaleString()} oracle cards from bulk file.`)
  return { byKey, setCodes }
}

async function main() {
  console.log('Fetching Scryfall bulk metadata...')
  const bulkList = await fetch(`${BASE}/bulk-data`, {
    headers: { Accept: 'application/json' },
  }).then((r) => r.json())

  const oracleMeta = bulkList.data.find((b) => b.type === 'oracle_cards')
  if (!oracleMeta) throw new Error('oracle_cards bulk not found on Scryfall')

  console.log(`Oracle cards bulk (~${(oracleMeta.size / 1e6).toFixed(0)} MB)...`)
  const tmpPath = await downloadBulk(oracleMeta.download_uri, 'oracle-cards')

  try {
    const { byKey, setCodes } = await processOracleBulk(tmpPath)
    const unique = [...byKey.values()].sort(
      (a, b) => (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999),
    )

    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(
      OUT,
      JSON.stringify({
        updated_at: new Date().toISOString(),
        count: unique.length,
        roles: ROLES.map((r) => ({ id: r.id, label: r.label })),
        set_codes: setCodes,
        cards: unique,
      }),
    )

    console.log(`Wrote ${unique.length} cards to ${OUT}`)
  } finally {
    try {
      unlinkSync(tmpPath)
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
