import type { CardRecord, UpgradeRecommendation } from '../types/card'
import type { Bracket, DeckAnalysis } from '../types/mtg'
import { resolveThemeArchetypes } from './archetypes'

const ROLE_MIN_COUNT = 2

const ROLE_META: Record<
  string,
  { label: string; maxCmc: (b: Bracket) => number }
> = {
  ramp: { label: 'Mana ramp', maxCmc: (b) => (b <= 2 ? 4 : b <= 4 ? 3 : 2) },
  draw: { label: 'Card draw', maxCmc: (b) => (b <= 2 ? 5 : 4) },
  removal: { label: 'Targeted removal', maxCmc: () => 4 },
  wipe: { label: 'Board wipe', maxCmc: (b) => (b <= 2 ? 7 : 6) },
  tutor: { label: 'Tutors', maxCmc: (b) => (b <= 3 ? 4 : 3) },
  protection: { label: 'Protection', maxCmc: () => 4 },
  recursion: { label: 'Recursion', maxCmc: (b) => (b <= 2 ? 6 : 5) },
}

function deckRoleCount(
  deckNames: Set<string>,
  cards: CardRecord[],
  roleId: string,
): number {
  return cards.filter((c) => deckNames.has(c.name.toLowerCase()) && c.roles.includes(roleId))
    .length
}

function deckArchetypeTags(deckCards: CardRecord[]): string[] {
  const tags = new Set<string>()
  for (const c of deckCards) c.tags.forEach((t) => tags.add(t))
  return [...tags]
}

function scoreUpgradeCandidate(
  card: CardRecord,
  deckArchetypes: string[],
  bracket: Bracket,
): number {
  let score = 0
  const price = parseFloat(card.prices?.usd ?? '0') || 0

  for (const arch of deckArchetypes) {
    if (card.tags.includes(arch)) score += 15
  }

  if (card.edhrec_rank) {
    score += Math.max(0, 25 - Math.log10(card.edhrec_rank) * 6)
  }

  const maxCmc = ROLE_META[card.roles[0] ?? '']?.maxCmc(bracket) ?? 5
  if (card.cmc <= maxCmc) score += 8
  else score -= (card.cmc - maxCmc) * 4

  if (bracket >= 4 && card.roles.includes('tutor')) score += 10
  if (bracket <= 2 && card.roles.includes('wipe')) score += 5

  score -= price * 0.3

  return score
}

export function suggestUpgradesLocal(
  analysis: DeckAnalysis,
  allCards: CardRecord[],
  bracket: Bracket,
  budgetPerCard: number,
): UpgradeRecommendation[] {
  const deckNameSet = new Set(
    analysis.cards.map((c) => c.name.toLowerCase()),
  )
  if (analysis.commander) deckNameSet.add(analysis.commander.name.toLowerCase())

  const deckRecords = analysis.cards
    .filter((c) => c.card)
    .map((c) =>
      allCards.find((x) => x.name.toLowerCase() === c.name.toLowerCase()),
    )
    .filter((c): c is CardRecord => !!c)

  const identity = new Set(analysis.colorIdentity)
  const isColorlessDeck = identity.size === 0
  const deckArch = deckArchetypeTags(deckRecords)
  const themeFromCommander = analysis.commander?.name ?? ''
  const themeArch = resolveThemeArchetypes(
    `${themeFromCommander} ${deckArch.join(' ')}`,
  )
  const combinedArch = [...new Set([...deckArch, ...themeArch])]

  const recommendations: UpgradeRecommendation[] = []

  for (const [roleId, meta] of Object.entries(ROLE_META)) {
    const have = deckRoleCount(deckNameSet, deckRecords, roleId)
    if (have >= ROLE_MIN_COUNT) continue

    const candidates = allCards.filter((card) => {
      if (deckNameSet.has(card.name.toLowerCase())) return false
      if (!card.roles.includes(roleId)) return false

      const price = parseFloat(card.prices?.usd ?? '0') || 0
      if (price > budgetPerCard) return false

      const cardIdentity = card.color_identity
      if (isColorlessDeck) {
        if (cardIdentity.length > 0) return false
      } else if (cardIdentity.length === 0) {
        return true // colorless cards fit any deck
      } else {
        if (!cardIdentity.every((c) => identity.has(c))) return false
      }

      const maxCmc = meta.maxCmc(bracket)
      if (card.cmc > maxCmc + 2) return false

      return true
    })

    const scored = candidates
      .map((card) => ({
        card,
        score: scoreUpgradeCandidate(card, combinedArch, bracket),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.card)

    if (scored.length === 0) continue

    recommendations.push({
      role: meta.label,
      roleId,
      reason: `You have ${have} ${meta.label.toLowerCase()} effect${have === 1 ? '' : 's'} — most Bracket ${bracket} decks want at least ${ROLE_MIN_COUNT}.`,
      cards: scored,
    })
  }

  const avgCmc = analysis.avgCmc
  if (avgCmc > 3.8 && bracket <= 3) {
    const rampOpts = allCards
      .filter((c) => {
        if (deckNameSet.has(c.name.toLowerCase())) return false
        if (!c.roles.includes('ramp') || c.cmc > 3) return false
        const price = parseFloat(c.prices?.usd ?? '0') || 0
        if (price > budgetPerCard) return false
        if (isColorlessDeck) return c.color_identity.length === 0
        if (c.color_identity.length === 0) return true
        return c.color_identity.every((col) => identity.has(col))
      })
      .sort(
        (a, b) =>
          (a.edhrec_rank ?? 999999) - (b.edhrec_rank ?? 999999),
      )
      .slice(0, 6)

    if (rampOpts.length > 0) {
      recommendations.push({
        role: 'Curve trim',
        roleId: 'curve',
        reason: `Average CMC is ${avgCmc.toFixed(2)} — add low-curve ramp and trim top-end.`,
        cards: rampOpts,
      })
    }
  }

  return recommendations.slice(0, 8)
}
