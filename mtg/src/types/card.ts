import type { ManaColor } from './mtg'

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
  prices?: { usd?: string | null }
}

export type CardDatabase = {
  updated_at: string
  count: number
  roles: Array<{ id: string; label: string }>
  cards: CardRecord[]
}

export type UpgradeRecommendation = {
  role: string
  roleId: string
  reason: string
  cards: CardRecord[]
}
