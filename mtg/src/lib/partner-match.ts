import type { CommanderPairMatch, CommanderRecord } from '../types/commander'
import type { ColorFilter, ManaColor } from '../types/mtg'
import { MANA_COLORS } from '../types/mtg'
import { scoreCommander } from './commander-match'
import { resolveThemeArchetypes } from './archetypes'
import { fitsColorIdentity } from './color-filter'
import { type CommanderSort } from './edhrec'
import { normalizeWithTypos } from './fuzzy-text'
import { detectKeywordsInText } from './mtg-keywords'

export type PartnerKind =
  | 'partner'
  | 'partner-with'
  | 'friends-forever'
  | 'background'
  | 'doctors-companion'

export type PartnerInfo = {
  kinds: PartnerKind[]
  /** For "Partner with X" — the required partner name */
  partnerWithName?: string
}

export function getPartnerInfo(commander: CommanderRecord): PartnerInfo {
  const text = commander.oracle_text
  const keywords = commander.keywords.map((k) => k.toLowerCase())
  const kinds: PartnerKind[] = []

  if (/partner with/i.test(text)) {
    kinds.push('partner-with')
  } else if (keywords.includes('partner') || /\bPartner \(You can have two commanders/i.test(text)) {
    kinds.push('partner')
  }
  if (/friends forever/i.test(text) || keywords.includes('friends forever')) {
    kinds.push('friends-forever')
  }
  if (/choose a background/i.test(text)) kinds.push('background')
  if (/doctor's companion/i.test(text) || keywords.includes("doctor's companion")) {
    kinds.push('doctors-companion')
  }

  let partnerWithName: string | undefined
  const pw = text.match(/Partner with ([^(]+)/i)
  if (pw) partnerWithName = pw[1].trim()

  return { kinds: [...new Set(kinds)], partnerWithName }
}

export function isBackgroundCommander(c: CommanderRecord): boolean {
  return c.type_line.toLowerCase().includes('background')
}

export function isTimeLordDoctor(c: CommanderRecord): boolean {
  return /time lord doctor/i.test(`${c.type_line} ${c.oracle_text}`)
}

function namesMatch(a: string, b: string): boolean {
  return a.toLowerCase().trim() === b.toLowerCase().trim()
}

function combinedIdentity(a: CommanderRecord, b: CommanderRecord): ManaColor[] {
  const set = new Set<ManaColor>([...a.color_identity, ...b.color_identity])
  return MANA_COLORS.filter((c) => set.has(c))
}

function pairTypeLabel(primary: PartnerInfo, partner: PartnerInfo, a: CommanderRecord, b: CommanderRecord): string {
  if (primary.partnerWithName || partner.partnerWithName) return 'Partner with'
  if (primary.kinds.includes('background') && isBackgroundCommander(b)) return 'Background'
  if (partner.kinds.includes('background') && isBackgroundCommander(a)) return 'Background'
  if (primary.kinds.includes('friends-forever') && partner.kinds.includes('friends-forever')) {
    return 'Friends forever'
  }
  if (
    (primary.kinds.includes('doctors-companion') && isTimeLordDoctor(b)) ||
    (partner.kinds.includes('doctors-companion') && isTimeLordDoctor(a))
  ) {
    return "Doctor's companion"
  }
  return 'Partner'
}

export function canCommandersPair(a: CommanderRecord, b: CommanderRecord): boolean {
  if (a.id === b.id) return false

  const infoA = getPartnerInfo(a)
  const infoB = getPartnerInfo(b)

  if (infoA.partnerWithName && namesMatch(infoA.partnerWithName, b.name)) return true
  if (infoB.partnerWithName && namesMatch(infoB.partnerWithName, a.name)) return true

  if (infoA.kinds.includes('partner') && infoB.kinds.includes('partner')) {
    if (!infoA.partnerWithName && !infoB.partnerWithName) return true
  }

  if (infoA.kinds.includes('friends-forever') && infoB.kinds.includes('friends-forever')) {
    return true
  }

  if (infoA.kinds.includes('background') && isBackgroundCommander(b)) return true
  if (infoB.kinds.includes('background') && isBackgroundCommander(a)) return true

  if (infoA.kinds.includes('doctors-companion') && isTimeLordDoctor(b)) return true
  if (infoB.kinds.includes('doctors-companion') && isTimeLordDoctor(a)) return true

  return false
}

function canBePrimaryCommander(c: CommanderRecord): boolean {
  const info = getPartnerInfo(c)
  return info.kinds.length > 0 && !isBackgroundCommander(c)
}

export function matchCommanderPairs(
  commanders: CommanderRecord[],
  theme: string,
  colorFilter: ColorFilter,
  limit = 30,
  sort: CommanderSort = 'match',
): CommanderPairMatch[] {
  const { text: normalizedTheme } = normalizeWithTypos(theme)
  const themeArchetypes = resolveThemeArchetypes(normalizedTheme)
  const themeKeywords = detectKeywordsInText(normalizedTheme)
  const hasTheme =
    normalizedTheme.trim().length > 0 ||
    themeArchetypes.length > 0 ||
    themeKeywords.length > 0

  const primaries = commanders.filter((c) => canBePrimaryCommander(c))
  const backgrounds = commanders.filter(isBackgroundCommander)
  const pairable = [...primaries, ...backgrounds]

  const pairs: CommanderPairMatch[] = []
  const seen = new Set<string>()

  for (const primary of primaries) {
    const primaryScore = scoreCommander(primary, normalizedTheme, themeArchetypes)

    if (hasTheme && primaryScore.score <= 0) continue

    const candidates = pairable.filter(
      (p) =>
        p.id !== primary.id &&
        canCommandersPair(primary, p) &&
        fitsColorIdentity(combinedIdentity(primary, p), colorFilter),
    )

    for (const partner of candidates) {
      const key = [primary.id, partner.id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)

      const partnerScore = scoreCommander(partner, normalizedTheme, themeArchetypes)
      const combinedScore = hasTheme
        ? (primaryScore.score + partnerScore.score) / 2
        : ((primary.edhrec_rank ?? 9999) + (partner.edhrec_rank ?? 9999)) / -200 + 50

      if (hasTheme && combinedScore <= 0) continue

      const matchedTags = [...new Set([...primaryScore.matchedTags, ...partnerScore.matchedTags])]
      const reasons = [
        ...primaryScore.reasons.slice(0, 2),
        ...partnerScore.reasons.slice(0, 2),
      ].slice(0, 3)

      pairs.push({
        primary,
        partner,
        score: combinedScore,
        matchPercent: 0,
        matchedTags,
        reasons,
        pairType: pairTypeLabel(getPartnerInfo(primary), getPartnerInfo(partner), primary, partner),
      })
    }
  }

  const sorted = pairs
    .sort((a, b) => {
      if (sort === 'popularity') {
        const ar = (a.primary.edhrec_rank ?? 999999) + (a.partner.edhrec_rank ?? 999999)
        const br = (b.primary.edhrec_rank ?? 999999) + (b.partner.edhrec_rank ?? 999999)
        if (ar !== br) return ar - br
        return b.score - a.score
      }
      if (b.score !== a.score) return b.score - a.score
      const ar = (a.primary.edhrec_rank ?? 999999) + (a.partner.edhrec_rank ?? 999999)
      const br = (b.primary.edhrec_rank ?? 999999) + (b.partner.edhrec_rank ?? 999999)
      return ar - br
    })
    .slice(0, limit)

  const maxScore = Math.max(...sorted.map((p) => p.score), 1)

  return sorted.map((p) => ({
    ...p,
    matchPercent: hasTheme ? Math.round((p.score / maxScore) * 100) : 0,
  }))
}

export function canSearchPairs(commanders: CommanderRecord[]): boolean {
  return commanders.some((c) => getPartnerInfo(c).kinds.length > 0 || isBackgroundCommander(c))
}
