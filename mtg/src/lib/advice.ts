import type { DeckAnalysis } from '../types/mtg'
import { cardOracleText } from '../api/scryfall'

type BeatAdvice = {
  title: string
  tips: string[]
}

export function howToBeat(analysis: DeckAnalysis): BeatAdvice[] {
  const main = analysis.cards.filter((c) => c.card).map((c) => c.card!)
  const oracle = main.map((c) => cardOracleText(c).toLowerCase()).join(' ')
  const advice: BeatAdvice[] = []

  if (/combo|win the game|infinite|untap/.test(oracle)) {
    advice.push({
      title: 'Combo / instant wins',
      tips: [
        'Hold interaction for payoff moments, not setup pieces.',
        'Use graveyard hate (Rest in Peace, Leyline) if combos use yard.',
        'Pressure life before they assemble — force them to react.',
      ],
    })
  }

  if (/token|create .* token/.test(oracle)) {
    advice.push({
      title: 'Go-wide tokens',
      tips: [
        'Prioritize sweepers and repeatable removal.',
        'Avoid trading 1-for-1 on small bodies — save removal for engines.',
        'Poison or mill can bypass large boards.',
      ],
    })
  }

  if (/\+1\/\+1 counter|double .* counter/.test(oracle)) {
    advice.push({
      title: 'Counters matter',
      tips: [
        'Destroy creatures with few counters before they snowball.',
        'Exile or bounce key pieces — -1/-1 and shrink effects help.',
        'Board wipes when they overcommit after a big turn.',
      ],
    })
  }

  if (/draw|investigate|connive|impulse|surveil/.test(oracle)) {
    advice.push({
      title: 'Card advantage',
      tips: [
        'Tax effects (Rhystic Study, Smothering Tithe) punish draws.',
        'Target their engines, not random dorks.',
        'Race only if you have a faster clock — otherwise grind with answers.',
      ],
    })
  }

  if (/sacrifice|dies|graveyard|reanimate/.test(oracle)) {
    advice.push({
      title: 'Graveyard / sacrifice',
      tips: [
        'Exile over destroy when possible; graveyard hate is high value.',
        'Remove aristocrat payoffs before small sac fodder.',
        'Spot removal on commanders that enable the engine.',
      ],
    })
  }

  if (advice.length === 0) {
    advice.push({
      title: 'General game plan',
      tips: [
        `Respect ${analysis.commander?.name ?? 'their commander'} — save removal for when it matters.`,
        'Identify their primary win condition in the first few turns.',
        'Mana denial is weak in multiplayer — focus on card advantage and removal.',
        `Their colors (${analysis.colorIdentity.join('') || 'colorless'}) suggest packing common hate in those colors.`,
      ],
    })
  }

  return advice
}
