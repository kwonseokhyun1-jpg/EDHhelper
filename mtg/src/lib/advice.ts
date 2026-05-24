import type { CardRecord } from '../types/card'
import type { DeckAnalysis } from '../types/mtg'
import { getCardByNameLocal } from './card-db'

export type StrengthWeakness = {
  strengths: string[]
  weaknesses: string[]
}

function countDeckRoles(analysis: DeckAnalysis): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const entry of analysis.cards) {
    const local = getCardByNameLocal(entry.name)
    if (!local) continue
    for (const role of local.roles) {
      counts[role] = (counts[role] ?? 0) + entry.quantity
    }
  }

  return counts
}

function countLands(analysis: DeckAnalysis): number {
  let lands = 0
  for (const entry of analysis.cards) {
    const local = getCardByNameLocal(entry.name)
    if (local?.type_line.toLowerCase().includes('land')) lands += entry.quantity
  }
  return lands
}

function topArchetypeTags(analysis: DeckAnalysis): [string, number][] {
  const tagCounts = new Map<string, number>()

  for (const entry of analysis.cards) {
    const local = getCardByNameLocal(entry.name)
    if (!local) continue
    for (const tag of local.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + entry.quantity)
    }
  }

  return [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
}

export function deckStrengthsWeaknesses(
  analysis: DeckAnalysis,
  gameChangers: CardRecord[] = [],
): StrengthWeakness {
  const strengths: string[] = []
  const weaknesses: string[] = []
  const roles = countDeckRoles(analysis)
  const lands = countLands(analysis)
  const commander = analysis.commander?.name ?? 'your commander'

  if (lands >= 36) {
    strengths.push(`Runs ${lands} lands — a stable foundation for casting spells on curve.`)
  } else if (lands < 34) {
    weaknesses.push(
      `Only ${lands} lands — missing land drops will stall ${commander} and your mid-game plan.`,
    )
  }

  const ramp = roles.ramp ?? 0
  if (ramp >= 8) strengths.push(`${ramp} ramp sources help you deploy threats ahead of the table.`)
  else if (ramp < 5) weaknesses.push('Light on ramp — expensive spells may sit in hand while others take over.')

  const draw = roles.draw ?? 0
  if (draw >= 6) strengths.push('Good card draw density keeps gas in longer games.')
  else if (draw < 3) weaknesses.push('Limited card draw — you may run out of options after the first wave of plays.')

  const removal = (roles.removal ?? 0) + (roles.wipe ?? 0)
  if (removal >= 8) strengths.push('Packed with interaction to answer opposing threats.')
  else if (removal < 4) {
    weaknesses.push('Few removal spells — you may struggle to stop an opponent who gets ahead.')
  }

  const tutors = roles.tutor ?? 0
  if (tutors >= 4) strengths.push('Multiple tutors improve consistency for your key pieces.')
  else if (tutors === 0) weaknesses.push('No tutors — assembling your best lines relies on natural draws.')

  const topTags = topArchetypeTags(analysis)
  if (topTags.length > 0 && topTags[0][1] >= 8) {
    strengths.push(
      `Cohesive ${topTags[0][0].replace(/-/g, ' ')} theme (${topTags[0][1]} on-theme cards).`,
    )
  } else if (topTags.length > 0 && topTags[0][1] < 4) {
    weaknesses.push(
      'Theme is spread thin — many cards may not synergize with your commander.',
    )
  }

  if (gameChangers.length >= 2) {
    strengths.push(
      `${gameChangers.length} Game Changer cards — high-impact plays that demand answers from the table.`,
    )
  } else if (gameChangers.length === 1) {
    strengths.push(
      `${gameChangers[0].name} is on the Commander Game Changer list — one resolved copy can define a game.`,
    )
  }

  if (analysis.avgCmc > 4.2) {
    weaknesses.push(
      `Average mana value of ${analysis.avgCmc.toFixed(2)} is steep — you need ramp or fast mana to keep pace.`,
    )
  } else if (analysis.avgCmc <= 2.8) {
    strengths.push(
      `Low curve (avg CMC ${analysis.avgCmc.toFixed(2)}) supports an aggressive, early-board plan.`,
    )
  }

  if (analysis.totalUsd > 400) {
    strengths.push('High estimated deck value — premium mana base and staples improve consistency.')
  } else if (analysis.totalUsd < 80) {
    weaknesses.push(
      'Budget build — consider upgrading mana rocks and lands when you can for smoother games.',
    )
  }

  if (strengths.length === 0) {
    strengths.push('Balanced structure without an obvious single strength — refine around your win condition.')
  }
  if (weaknesses.length === 0) {
    weaknesses.push('No major structural gaps — focus on meta-specific interaction and redundancy.')
  }

  return { strengths, weaknesses }
}
