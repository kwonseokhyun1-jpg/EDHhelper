import type { ManaColor } from './mtg'

export type CommanderRecord = {
  id: string
  name: string
  color_identity: ManaColor[]
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text: string
  keywords: string[]
  tags: string[]
  image?: string
  scryfall_uri: string
  edhrec_rank?: number
  prices?: { usd?: string | null }
}

export type CommanderDatabase = {
  updated_at: string
  count: number
  archetypes: Array<{ id: string; aliases: string[] }>
  commanders: CommanderRecord[]
}

export type CommanderPairMatch = {
  primary: CommanderRecord
  partner: CommanderRecord
  score: number
  matchPercent: number
  matchedTags: string[]
  reasons: string[]
  pairType: string
}

export type CommanderMatch = {
  commander: CommanderRecord
  score: number
  matchPercent: number
  matchedTags: string[]
  reasons: string[]
}
