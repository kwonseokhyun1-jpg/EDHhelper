import type { ColorChoice, ColorFilter, ManaColor } from '../types/mtg'
import { MANA_COLORS } from '../types/mtg'

export function parseColorChoices(selected: ColorChoice[]): ColorFilter {
  const colorlessOnly = selected.includes('C') && selected.filter((c) => c !== 'C').length === 0
  const colors = sortIdentity(selected.filter((c): c is ManaColor => c !== 'C'))
  return { colors, colorlessOnly }
}

/** WUBRG order for stable identity strings */
export function sortIdentity(colors: ManaColor[]): ManaColor[] {
  return MANA_COLORS.filter((c) => colors.includes(c))
}

/** Exact color identity match — W+U means Azorius only, not mono-W, mono-U, or Esper */
export function fitsColorIdentity(
  identity: ManaColor[],
  filter: ColorFilter,
): boolean {
  const sortedIdentity = sortIdentity(identity)

  if (filter.colorlessOnly) return sortedIdentity.length === 0

  if (filter.colors.length === 0) return true

  if (sortedIdentity.length !== filter.colors.length) return false

  return filter.colors.every((c) => sortedIdentity.includes(c))
}

export function toggleColorChoice(
  selected: ColorChoice[],
  choice: ColorChoice,
): ColorChoice[] {
  if (choice === 'C') {
    if (selected.includes('C')) return []
    return ['C']
  }

  const withoutC = selected.filter((c) => c !== 'C')
  if (withoutC.includes(choice)) {
    return withoutC.filter((c) => c !== choice)
  }
  return [...withoutC, choice]
}

export function colorFilterLabel(filter: ColorFilter): string {
  if (filter.colorlessOnly) return 'Colorless only'
  if (filter.colors.length === 0) return 'Any colors'
  return `Exactly ${filter.colors.join('')}`
}
