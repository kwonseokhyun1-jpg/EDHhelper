export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G'

/** WUBRG or C (colorless-only filter) */
export type ColorChoice = ManaColor | 'C'

export type ColorFilter = {
  colors: ManaColor[]
  /** When true, only cards/commanders with empty color identity */
  colorlessOnly: boolean
}

export type ScryfallCard = {
  id: string
  name: string
  type_line: string
  oracle_text?: string
  mana_cost?: string
  cmc: number
  colors?: string[]
  color_identity: string[]
  keywords?: string[]
  image_uris?: {
    normal?: string
    small?: string
    art_crop?: string
  }
  card_faces?: Array<{
    name: string
    type_line: string
    oracle_text?: string
    mana_cost?: string
    image_uris?: { normal?: string; small?: string; art_crop?: string }
  }>
  prices: {
    usd?: string | null
    usd_foil?: string | null
    tcgplayer_retrieved_at?: string | null
  }
  legalities: Record<string, string>
  edhrec_rank?: number
  released_at?: string
  set_name?: string
  tcgplayer_id?: number
  scryfall_uri: string
}

export type ScryfallSearchResponse = {
  object: 'list'
  total_cards: number
  has_more: boolean
  next_page?: string
  data: ScryfallCard[]
}

export type DeckCard = {
  quantity: number
  name: string
  card?: ScryfallCard
  error?: string
}

export type DeckAnalysis = {
  commander?: DeckCard
  cards: DeckCard[]
  totalCards: number
  uniqueCards: number
  colorIdentity: ManaColor[]
  avgCmc: number
  totalUsd: number
  issues: string[]
  warnings: string[]
}

export type CardSort =
  | 'relevance'
  | 'name'
  | 'cmc'
  | 'usd'
  | 'released'
  | 'edhrec'

export type Bracket = 1 | 2 | 3 | 4 | 5

export const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G']

export const COLOR_LABELS: Record<ManaColor | 'C', string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}
