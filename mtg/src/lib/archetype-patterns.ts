/** Oracle patterns for reanimator — return/play/cast from graveyard to the battlefield. */
export const REANIMATOR_ORACLE: RegExp[] = [
  /from (?:your |a |any )?graveyard to the battlefield/i,
  /from (?:your |a |any )?graveyard onto the battlefield/i,
  /return target .* from (?:your |a )?graveyard to the battlefield/i,
  /put target .* from (?:your |a |any )?graveyard onto the battlefield/i,
  /(?:in|from) (?:your |a )?graveyard.{0,160}return .* to the battlefield/is,
  /return target (?:artifact|creature|permanent|enchantment|planeswalker|land) card from (?:your |a )?graveyard/i,
  /creature card in (?:your |a )?graveyard.{0,120}return it to the battlefield/is,
  /may cast (?:a )?(?:creature|permanent) spell from your graveyard/i,
  /play (?:a )?land and cast (?:a )?permanent spell.{0,80}from your graveyard/i,
  /cast (?:a )?(?:creature|artifact|enchantment|planeswalker|instant|sorcery) .{0,40}from your graveyard/i,
]

export const REANIMATOR_EXCLUDES: RegExp[] = [
  /mill(?: \d+ cards?)?/i,
  /\bdredge\b/i,
  /whenever .* discards?/i,
  /(?:may )?discard (?:a |two |cards)/i,
  /put .* cards? .* into (?:their |a )?graveyard/i,
  /you may cast any number of spells from among/i,
  /exile the top .* of (?:their|target opponent)/i,
  /cast .* from (?:an )?opponent/i,
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

/** Wheels, forced draws, and payoffs when opponents draw. */
export const WHEEL_ORACLE: RegExp[] = [
  /each player discards? (?:their )?hand/i,
  /each player discards? .{0,100}draws?/is,
  /each player draws? seven cards/i,
  /at the beginning of each player'?s? draw step.{0,120}draws? an additional/i,
  /whenever an opponent draws?/i,
  /whenever a player draws? a card/i,
  /whenever another player draws?/i,
  /for each card (?:your )?opponents have drawn/i,
  /(?:opponents|each opponent) draw .{0,40}additional card/i,
]

export const WHEEL_EXCLUDES: RegExp[] = [
  /you may cast any number of spells from among/i,
  /exile the top .* of (?:their|target opponent)/i,
  /cast .* from (?:an )?opponent/i,
]

export function oracleMatchesReanimator(oracle: string): boolean {
  const cleaned = oracle.replace(/\([^)]*\)/g, ' ')
  const flat = cleaned.replace(/\n/g, ' ')
  if (REANIMATOR_EXCLUDES.some((re) => re.test(flat) || re.test(cleaned))) return false
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

export function oracleMatchesWheel(oracle: string): boolean {
  const cleaned = oracle.replace(/\([^)]*\)/g, ' ')
  const flat = cleaned.replace(/\n/g, ' ')
  if (WHEEL_EXCLUDES.some((re) => re.test(flat) || re.test(cleaned))) return false
  return WHEEL_ORACLE.some((re) => re.test(flat) || re.test(cleaned))
}

/** Tax, prison, and resource-denial effects — not symmetric "each opponent" punishers. */
export const STAX_ORACLE: RegExp[] = [
  /unless (?:that player|an opponent|(?:the )?target opponent|the attacking player|its controller|their controller|that creature's controller|they) pays?/i,
  /can't attack (?:you )?unless/i,
  /can't attack unless/i,
  /can't cast (?:noncreature )?spells?/i,
  /skip .* (?:combat|draw|upkeep)/i,
  /don't untap/i,
  /costs? \{[^}]+\} more to cast/i,
  /spells? cost .* more/i,
  /activated abilities cost .* more/i,
  /each player may attack only/i,
  /creatures can't attack you/i,
]

export const STAX_EXCLUDES: RegExp[] = [
  /each opponent (?:loses|mills|discards|sacrifices|creates|draws|gains|exiles)/i,
  /deals? .* damage to each opponent/i,
  /each opponent (?:loses|gains) .* life/i,
  /unless you pay/i,
]

export function oracleMatchesStax(oracle: string): boolean {
  const cleaned = oracle.replace(/\([^)]*\)/g, ' ')
  const flat = cleaned.replace(/\n/g, ' ')
  if (STAX_EXCLUDES.some((re) => re.test(flat) || re.test(cleaned))) return false
  return STAX_ORACLE.some((re) => re.test(flat) || re.test(cleaned))
}
