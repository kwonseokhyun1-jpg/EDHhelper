import type { ManaColor } from './mtg'

export type CardFace = {
  name: string
  type_line: string
  oracle_text: string
  mana_cost?: string
  image?: string
}

export type CardPrinting = {
  id: string
  set: string
  set_name: string
  collector_number: string
  image?: string
  prices?: { usd?: string | null }
  scryfall_uri: string
  released_at?: string
}

export type CardRecord = {
  id: string
  name: string
  color_identity: ManaColor[]
  cmc: number
  mana_cost?: string
  type_line: string
  oracle_text: string
  keywords: string[]
  tags: string[]
  roles: string[]
  image?: string
  scryfall_uri: string
  edhrec_rank?: number
  game_changer?: boolean
  prices?: { usd?: string | null }
  printings?: CardPrinting[]
  card_faces?: CardFace[]
}

export type CardDatabase = {
  updated_at: string
  count: number
  roles: Array<{ id: string; label: string }>
  set_codes?: Record<string, string>
  printing_lookup?: Record<string, string>
  cards: CardRecord[]
}

export type CardMatch = {
  card: CardRecord
  score: number
  matchPercent: number
  matchedTags: string[]
  reasons: string[]
}

export type UpgradeRecommendation = {
  role: string
  roleId: string
  reason: string
  cards: CardRecord[]
}
