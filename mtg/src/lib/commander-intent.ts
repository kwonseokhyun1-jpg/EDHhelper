import { ARCHETYPES, archetypeById, resolveThemeArchetypes } from './archetypes'
import { detectTribesInText, singularizeTribe } from './commander-tribes'
import { normalizeWithTypos } from './fuzzy-text'
import { detectKeywordsInText } from './mtg-keywords'
import { expandSlangInPrompt, getSlangArchetypeIds } from './mtg-slang'

/** Multi-word playstyle phrases → archetype ids */
const THEME_PHRASES: Array<{ pattern: RegExp; archetypes: string[] }> = [
  { pattern: /\blands?\s+matter\b/, archetypes: ['lands'] },
  { pattern: /\bgroup\s+hug\b/, archetypes: ['group-hug'] },
  { pattern: /\bgo[\s-]?wide\b/, archetypes: ['tokens'] },
  { pattern: /\bstax\b|\btaxes\b|\bresource\s+denial\b/, archetypes: ['stax'] },
  { pattern: /\baristocrats?\b|\bsacrifice\s+(?:outlet|synerg)/, archetypes: ['aristocrats'] },
  { pattern: /\bspellslinger\b|\binstants?\s+(?:and|&)\s+sorcer/, archetypes: ['spellslinger'] },
  { pattern: /\b\+?1\/\+?1\s+counters?\b|\bproliferate\b/, archetypes: ['counters'] },
  { pattern: /\bvoltron\b|\bequipment\b|\bauras?\s+matter\b/, archetypes: ['voltron'] },
  { pattern: /\bblink\b|\bflicker\b|\betb\b|\benter(?:s)?\s+the\s+battlefield\b/, archetypes: ['blink'] },
  { pattern: /\breanimator?\b|\bgraveyard\b/, archetypes: ['graveyard'] },
  { pattern: /\baggro\b|\bbeatdown\b|\bcombat\b/, archetypes: ['combat'] },
  { pattern: /\bcontrol\b|\bcounterspells?\b|\bpermission\b/, archetypes: ['control'] },
  { pattern: /\bcombo\b|\binfinite\b/, archetypes: ['combo'] },
  { pattern: /\bartifacts?\b|\btreasure\b/, archetypes: ['artifacts', 'treasure'] },
  { pattern: /\benchantments?\b|\bconstellation\b|\bshrines?\b/, archetypes: ['enchantments'] },
  { pattern: /\benchantress\b|\benchantrix\b/, archetypes: ['enchantments'] },
  { pattern: /\btheft\b|\bsteal(?:s|ing)?\b|\bthieves?\b/, archetypes: ['theft'] },
  { pattern: /\bsuperfriends\b|\bplaneswalkers?\b/, archetypes: ['superfriends'] },
  { pattern: /\bburn\b|\bdirect damage\b/, archetypes: ['burn'] },
  { pattern: /\bmill(?:ing)?\b/, archetypes: ['mill'] },
  { pattern: /\blifegain\b|\bextort\b/, archetypes: ['lifegain'] },
  { pattern: /\blandfall\b/, archetypes: ['lands'] },
  { pattern: /\bpillowfort\b|\bpillow[\s-]?fort\b/, archetypes: ['stax'] },
  { pattern: /\bblue farm\b|\btymna[\s/]+kraum\b/, archetypes: ['spellslinger', 'control'] },
  { pattern: /\bcedh\b|\bcompetitive edh\b/, archetypes: ['combo', 'control'] },
  { pattern: /\bramp\b|\bmana\s+rocks?\b/, archetypes: ['treasure'] },
]

export type CommanderIntent = {
  normalizedTheme: string
  archetypes: string[]
  keywords: ReturnType<typeof detectKeywordsInText>
  tribalTypes: string[]
  phrases: string[]
}

export function parseCommanderIntent(theme: string): CommanderIntent {
  const { text: normalizedTheme } = normalizeWithTypos(theme)
  const expanded = expandSlangInPrompt(theme)
  const { text: expandedTheme } = normalizeWithTypos(expanded)

  const archetypes = new Set(resolveThemeArchetypes(normalizedTheme))
  const phrases: string[] = []

  for (const id of getSlangArchetypeIds(theme)) archetypes.add(id)

  for (const { pattern, archetypes: ids } of THEME_PHRASES) {
    if (pattern.test(normalizedTheme)) {
      for (const id of ids) archetypes.add(id)
      phrases.push(pattern.source.replace(/\\b/g, '').slice(0, 40))
    }
  }

  const tribalTypes = detectTribesInText(expandedTheme).map(singularizeTribe)
  const uniqueTribal = [...new Set(tribalTypes)]

  const wantsTribal =
    uniqueTribal.length > 0 ||
    /\b(tribal|tribe)\b/.test(normalizedTheme)

  if (wantsTribal && uniqueTribal.length > 0) archetypes.add('tribal')

  if (/\benchantments?\b|\benchantress\b|\benchantrix\b/.test(normalizedTheme)) {
    archetypes.delete('voltron')
    archetypes.add('enchantments')
  }
  if (/\bequipment\b|\bvoltron\b/.test(normalizedTheme)) {
    archetypes.delete('enchantments')
  }

  return {
    normalizedTheme,
    archetypes: [...archetypes],
    keywords: detectKeywordsInText(normalizedTheme),
    tribalTypes: uniqueTribal,
    phrases,
  }
}

export function describeCommanderIntent(intent: CommanderIntent): string {
  const parts: string[] = []
  if (intent.archetypes.length > 0) {
    const labels = intent.archetypes.map((id) => archetypeById(id)?.label ?? id)
    parts.push(`Archetypes: ${labels.join(', ')}`)
  }
  if (intent.tribalTypes.length > 0) {
    parts.push(`Tribal: ${intent.tribalTypes.join(', ')}`)
  }
  if (intent.keywords.length > 0) {
    parts.push(`Keywords: ${intent.keywords.map((k) => k.name).join(', ')}`)
  }
  return parts.join(' · ')
}

export function themeHasIntent(intent: CommanderIntent): boolean {
  return (
    intent.normalizedTheme.trim().length > 0 ||
    intent.archetypes.length > 0 ||
    intent.keywords.length > 0 ||
    intent.tribalTypes.length > 0
  )
}

/** Re-export for archetype signal checks in scoring */
export { ARCHETYPES, archetypeById }
