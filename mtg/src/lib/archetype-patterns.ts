/** Oracle patterns for reanimator — return/play/cast from your graveyard to the battlefield. */
export const REANIMATOR_ORACLE: RegExp[] = [
  /from your graveyard to the battlefield/i,
  /return target .* from your graveyard to the battlefield/i,
  /return .* from your graveyard/i,
  /cast .* from your graveyard/i,
  /play .* from your graveyard/i,
  /(?:in|from) your graveyard.{0,160}return .* to the battlefield/is,
  /return target (?:artifact|creature|permanent|enchantment|planeswalker) card from your graveyard/i,
  /creature card in your graveyard.{0,120}return it to the battlefield/is,
  /may cast a creature spell from your graveyard/i,
]

/** Oracle patterns for theft — cast or control cards from opponents' zones. */
export const THEFT_ORACLE: RegExp[] = [
  /cast .* from (?:an )?opponent/i,
  /you may cast .* opponent/i,
  /look at the top .* opponent'?s? library.*you may cast/i,
  /exile the top .*cards? of (?:their|target opponent'?s?) library.*you may cast/i,
  /each player exiles? cards? from the top of their library.*you may cast/i,
  /exile .* face down.*you may cast/i,
  /exchange control of (?:target )?permanents?/i,
  /gain control of (?:target )?permanents?/i,
]

/** Symmetric table-wide benefits — not punisher wheels or attack restrictions. */
export const GROUP_HUG_ORACLE: RegExp[] = [
  /each player may draw a card/i,
  /each player draws? (?:a |one |two |three |\d+ )?cards?/i,
  /each player gains? \d+ life/i,
  /each player adds? \{[wubrgc]/i,
  /each player may put (?:a |up to .* )?land .* onto the battlefield/i,
  /each player creates? .* [Tt]reasure tokens?/i,
]

export const GROUP_HUG_EXCLUDES: RegExp[] = [
  /whenever an opponent draws?.*(?:deals? \d+ damage|loses \d+ life)/i,
  /each player discards?/i,
  /each player sacrifices?/i,
  /each player may attack only/i,
  /you may cast any number of spells from among/i,
  /exile the top .* of (?:their|target opponent)/i,
]

export function oracleMatchesReanimator(oracle: string): boolean {
  const cleaned = oracle.replace(/\([^)]*\)/g, ' ')
  const flat = cleaned.replace(/\n/g, ' ')
  if (THEFT_ORACLE.some((re) => re.test(flat) || re.test(cleaned))) return false
  return REANIMATOR_ORACLE.some((re) => re.test(flat) || re.test(cleaned))
}

export function oracleMatchesTheft(oracle: string): boolean {
  const cleaned = oracle.replace(/\([^)]*\)/g, ' ')
  const flat = cleaned.replace(/\n/g, ' ')
  return THEFT_ORACLE.some((re) => re.test(flat) || re.test(cleaned))
}

export function oracleMatchesGroupHug(oracle: string): boolean {
  const cleaned = oracle.replace(/\([^)]*\)/g, ' ')
  const flat = cleaned.replace(/\n/g, ' ')
  if (GROUP_HUG_EXCLUDES.some((re) => re.test(flat) || re.test(cleaned))) return false
  return GROUP_HUG_ORACLE.some((re) => re.test(flat) || re.test(cleaned))
}
