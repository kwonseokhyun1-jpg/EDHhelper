import type { CardRecord, UpgradeRecommendation } from '../types/card'
import type { Bracket, DeckAnalysis, ManaColor } from '../types/mtg'
import { resolveCardNameFuzzy } from './card-name-resolve'
import type { EdhrecCommanderPage } from './edhrec-api'

const BASIC_LANDS = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
  'snow-covered mountain', 'snow-covered forest', 'wastes',
])

function fitsColorIdentity(card: CardRecord, identity: Set<ManaColor>): boolean {
  if (identity.size === 0) return card.color_identity.length === 0
  if (card.color_identity.length === 0) return true
  return card.color_identity.every((c) => identity.has(c))
}

function fitsBudget(card: CardRecord, budgetPerCard: number): boolean {
  const price = parseFloat(card.prices?.usd ?? '0') || 0
  return price <= budgetPerCard
}

function resolveCards(
  names: string[],
  allCards: CardRecord[],
  deckNames: Set<string>,
  identity: Set<ManaColor>,
  budgetPerCard: number,
): CardRecord[] {
  const seen = new Set<string>()
  const out: CardRecord[] = []

  for (const raw of names) {
    const local =
      allCards.find((c) => c.name.toLowerCase() === raw.toLowerCase()) ??
      resolveCardNameFuzzy(raw)
    if (!local) continue
    const key = local.name.toLowerCase()
    if (seen.has(key) || deckNames.has(key)) continue
    if (!fitsColorIdentity(local, identity)) continue
    if (!fitsBudget(local, budgetPerCard)) continue
    seen.add(key)
    out.push(local)
  }

  return out
}

function parseComboPieces(combo: string): string[] {
  return combo
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isInDeck(
  name: string,
  deckNames: Set<string>,
): boolean {
  if (deckNames.has(name.toLowerCase())) return true
  const resolved = resolveCardNameFuzzy(name)
  return resolved ? deckNames.has(resolved.name.toLowerCase()) : false
}

export function suggestComboUpgrades(
  analysis: DeckAnalysis,
  edhrec: EdhrecCommanderPage,
  allCards: CardRecord[],
  budgetPerCard: number,
): UpgradeRecommendation[] {
  const deckNames = new Set(
    analysis.cards.map((c) => c.name.toLowerCase()),
  )
  if (analysis.commander) deckNames.add(analysis.commander.name.toLowerCase())

  const identity = new Set(analysis.colorIdentity)
  const recommendations: UpgradeRecommendation[] = []
  const seenCombos = new Set<string>()

  for (const combo of edhrec.combos) {
    const pieces = parseComboPieces(combo)
    if (pieces.length < 2) continue

    const inDeck = pieces.filter((p) => isInDeck(p, deckNames))
    const missing = pieces.filter((p) => !isInDeck(p, deckNames))

    let targetNames: string[]
    let reason: string

    if (inDeck.length > 0 && missing.length > 0) {
      targetNames = missing
      reason = `You already run ${inDeck.join(' + ')} — add ${missing.join(' + ')} to complete this popular combo line.`
    } else if (inDeck.length === 0 && missing.length >= 2) {
      targetNames = pieces
      reason = `Popular combo with this commander: ${combo}.`
    } else {
      continue
    }

    const cards = resolveCards(targetNames, allCards, deckNames, identity, budgetPerCard)
    if (cards.length === 0) continue

    const key = pieces.sort().join('|')
    if (seenCombos.has(key)) continue
    seenCombos.add(key)

    recommendations.push({
      role: 'Combo pieces',
      roleId: `combo-${recommendations.length}`,
      reason,
      cards: cards.slice(0, 4),
    })
    if (recommendations.length >= 4) break
  }

  const synergyMissing = resolveCards(
    edhrec.highSynergy
      .filter((c) => c.synergy >= 0.08)
      .sort((a, b) => b.synergy - a.synergy)
      .slice(0, 20)
      .map((c) => c.name),
    allCards,
    deckNames,
    identity,
    budgetPerCard,
  ).slice(0, 6)

  if (synergyMissing.length >= 1) {
    recommendations.push({
      role: 'High-synergy additions',
      roleId: 'synergy',
      reason:
        'These cards see heavy play with this commander and pair well with your theme.',
      cards: synergyMissing,
    })
  }

  return recommendations.slice(0, 5)
}

function countDeckLands(analysis: DeckAnalysis, allCards: CardRecord[]): {
  total: number
  basics: number
  nonBasics: number
} {
  let total = 0
  let basics = 0

  for (const entry of analysis.cards) {
    const local = allCards.find(
      (c) => c.name.toLowerCase() === entry.name.toLowerCase(),
    )
    if (!local?.type_line.toLowerCase().includes('land')) continue
    total += entry.quantity
    if (BASIC_LANDS.has(local.name.toLowerCase())) basics += entry.quantity
  }

  return { total, basics, nonBasics: total - basics }
}

export function suggestLandUpgrades(
  analysis: DeckAnalysis,
  edhrec: EdhrecCommanderPage,
  allCards: CardRecord[],
  budgetPerCard: number,
): UpgradeRecommendation[] {
  const deckNames = new Set(
    analysis.cards.map((c) => c.name.toLowerCase()),
  )
  const identity = new Set(analysis.colorIdentity)
  const { total, nonBasics } = countDeckLands(analysis, allCards)
  const recommendations: UpgradeRecommendation[] = []

  const utilityCandidates = resolveCards(
    edhrec.utilityLands
      .sort((a, b) => b.inclusion - a.inclusion)
      .slice(0, 24)
      .map((c) => c.name),
    allCards,
    deckNames,
    identity,
    budgetPerCard,
  ).slice(0, 8)

  if (utilityCandidates.length > 0) {
    recommendations.push({
      role: 'Utility lands',
      roleId: 'utility-lands',
      reason:
        nonBasics < edhrec.avgNonbasicLands
          ? `You run ${nonBasics} nonbasic lands; typical ${edhrec.commanderName} lists use about ${edhrec.avgNonbasicLands}. These utility lands see heavy play.`
          : 'Upgrade basics or low-impact lands with these popular utility options.',
      cards: utilityCandidates,
    })
  }

  if (total < edhrec.avgLandCount - 1) {
    const landCandidates = resolveCards(
      edhrec.lands
        .filter((c) => !BASIC_LANDS.has(c.name.toLowerCase()))
        .slice(0, 16)
        .map((c) => c.name),
      allCards,
      deckNames,
      identity,
      budgetPerCard,
    ).slice(0, 6)

    if (landCandidates.length > 0) {
      recommendations.push({
        role: 'Mana base',
        roleId: 'mana-base',
        reason: `You have ${total} lands; typical lists for this commander run about ${edhrec.avgLandCount}.`,
        cards: landCandidates,
      })
    }
  }

  const rockCandidates = resolveCards(
    edhrec.manaArtifacts
      .slice(0, 12)
      .map((c) => c.name),
    allCards,
    deckNames,
    identity,
    budgetPerCard,
  ).slice(0, 6)

  if (rockCandidates.length >= 1 && analysis.avgCmc > 2.8) {
    recommendations.push({
      role: 'Mana rocks',
      roleId: 'mana-rocks',
      reason: 'Popular mana artifacts that smooth out your curve.',
      cards: rockCandidates,
    })
  }

  return recommendations.slice(0, 3)
}

export function mergeUpgradeSections(
  roleUpgrades: UpgradeRecommendation[],
  comboUpgrades: UpgradeRecommendation[],
  landUpgrades: UpgradeRecommendation[],
  bracket: Bracket,
): UpgradeRecommendation[] {
  const maxSections = bracket <= 2 ? 6 : 8
  return [...roleUpgrades, ...comboUpgrades, ...landUpgrades].slice(0, maxSections)
}
