import { normalizeWithTypos } from './fuzzy-text'

export type RuleSource = {
  topic: string
  summary: string
  citations: string[]
}

export type RuleClarification = {
  /** Short, definitive ruling — read this first */
  answer: string
  title: string
  explanation: string
  steps?: string[]
  sources: RuleSource[]
  confidence: 'high' | 'medium' | 'low'
  note?: string
}

type RuleEntry = {
  id: string
  title: string
  answer: string
  /** Topic keys from SOURCE_TOPICS — shown after the answer */
  sourceTopics: string[]
  all?: RegExp[]
  any: RegExp[]
  explanation: string
  steps?: string[]
  weight?: number
  note?: string
}

/** CR topic groups — attached after the definitive answer based on the matched issue */
const SOURCE_TOPICS: Record<string, Omit<RuleSource, 'topic'>> = {
  'triggered-abilities': {
    summary: 'When abilities trigger, go on the stack, and resolve.',
    citations: ['CR 603.1', 'CR 603.2', 'CR 603.3', 'CR 603.6', 'CR 603.10'],
  },
  'stack-resolution': {
    summary: 'How spells and abilities resolve on the stack.',
    citations: ['CR 608.1', 'CR 608.2', 'CR 608.4a'],
  },
  counters: {
    summary: 'Countering spells and abilities.',
    citations: ['CR 701.5', 'CR 701.6'],
  },
  targeting: {
    summary: 'Legal targets, illegal targets, and fizzling.',
    citations: ['CR 115.1', 'CR 608.2b', 'CR 608.2c', 'CR 701.20'],
  },
  'state-based-actions': {
    summary: 'Automatic game actions checked before priority (death, legend rule, etc.).',
    citations: ['CR 704.3', 'CR 704.5', 'CR 704.5f', 'CR 704.5g', 'CR 704.5j'],
  },
  'legend-rule': {
    summary: 'Controlling duplicate legendary permanents with the same name.',
    citations: ['CR 303.4', 'CR 704.5j'],
  },
  keywords: {
    summary: 'Keyword abilities such as indestructible, hexproof, and lifelink.',
    citations: ['CR 702.11', 'CR 702.12', 'CR 702.15', 'CR 702.60', 'CR 702.90'],
  },
  combat: {
    summary: 'Combat damage assignment, trample, and deathtouch.',
    citations: ['CR 510.1', 'CR 510.1c', 'CR 702.2'],
  },
  damage: {
    summary: 'How damage is dealt and marked on permanents and players.',
    citations: ['CR 119.3', 'CR 120.3', 'CR 120.3a'],
  },
  commander: {
    summary: 'Commander zone, commander tax, and commander damage.',
    citations: ['CR 903.8', 'CR 903.9', 'CR 903.10'],
  },
  'priority-stack': {
    summary: 'Priority, the stack, and responding to spells.',
    citations: ['CR 117', 'CR 405', 'CR 405.4'],
  },
  'mana-abilities': {
    summary: 'Mana abilities resolve immediately and do not use the stack.',
    citations: ['CR 605.1', 'CR 605.3'],
  },
  lands: {
    summary: 'Playing lands and land drops per turn.',
    citations: ['CR 305.1', 'CR 305.2'],
  },
  layers: {
    summary: 'Layer system for continuous effects (type, color, P/T, etc.).',
    citations: ['CR 613.1', 'CR 613.7', 'CR 613.8'],
  },
  'replacement-prevention': {
    summary: '"Instead" replacement effects vs damage prevention.',
    citations: ['CR 609.1', 'CR 614', 'CR 615'],
  },
  'copy-effects': {
    summary: 'Copying spells and permanents.',
    citations: ['CR 707.10', 'CR 608.2i'],
  },
  'counters-on-permanents': {
    summary: '+1/+1, -1/-1, poison, and other counters on permanents.',
    citations: ['CR 122.3', 'CR 704.5c', 'CR 704.5q'],
  },
  zones: {
    summary: 'Moving objects between zones ("dies", leaves the battlefield).',
    citations: ['CR 110.5', 'CR 400.7', 'CR 700.4'],
  },
  activated: {
    summary: 'Activated vs triggered abilities.',
    citations: ['CR 602.1', 'CR 603.1', 'CR 117.1a'],
  },
  'color-identity': {
    summary: 'Commander deck-building and color identity.',
    citations: ['CR 903.4', 'CR 903.4a'],
  },
  mulligans: {
    summary: 'Opening hands and mulligan procedure.',
    citations: ['CR 103.4', 'CR 903.5'],
  },
  'ability-text': {
    summary: 'What an object on the stack can do while resolving.',
    citations: ['CR 112.7a', 'CR 608.2'],
  },
}

const RULES: RuleEntry[] = [
  {
    id: 'counter-creature-etb',
    title: 'Countering a creature spell',
    answer: 'No — the ETB trigger does not happen.',
    sourceTopics: ['stack-resolution', 'triggered-abilities', 'counters'],
    all: [/counter/i, /(creature spell|spell.*creature|casts? .*creature)/i],
    any: [/does.*(etb|trigger|enter)|etb.*(happen|trigger|still)|enters.*battlefield/i, /counter.*creature/i],
    explanation:
      'If a creature spell is countered, it never enters the battlefield. It does not resolve, so "when ~ enters the battlefield" triggers never go on the stack.',
    steps: [
      'Creature spell on stack → opponent casts Counterspell targeting it.',
      'Counterspell resolves → creature spell is countered.',
      'No ETB triggers, no summoning sickness creature, nothing entered.',
    ],
  },
  {
    id: 'destroy-before-etb-resolves',
    title: 'Destroying a creature before its ETB trigger resolves',
    answer: 'Yes — the ETB trigger still resolves (read the card for targeting requirements).',
    sourceTopics: ['triggered-abilities', 'stack-resolution', 'ability-text'],
    any: [
      /destroy.*before.*(trigger|resolve|ability)/i,
      /(bolt|kill|remove).*in response.*(etb|enters|trigger)/i,
      /(etb|enters).*trigger.*(destroy|dies|killed|removed)/i,
    ],
    explanation:
      'The ETB trigger already triggered when the creature entered. Destroying the creature before that trigger resolves does not stop the trigger — it is already on the stack and will resolve unless countered.',
    steps: [
      'Creature enters → ETB trigger goes on stack (after the spell finishes resolving).',
      'Opponent responds with removal → creature dies.',
      'ETB trigger still resolves (unless it requires the creature on the battlefield — read the card).',
    ],
    note: 'Some abilities need a legal target on resolution, not just on trigger.',
  },
  {
    id: 'trigger-order-apnap',
    title: 'Multiple triggers at the same time',
    answer: 'Each player orders their own triggers; the active player puts triggers on the stack first (APNAP).',
    sourceTopics: ['triggered-abilities', 'priority-stack'],
    any: [
      /(two|multiple|both|several|same time).*trigger/i,
      /trigger.*(order|ordering|which first|who chooses)/i,
      /apnap/i,
    ],
    explanation:
      'When multiple triggered abilities trigger at the same time, their controller(s) put them on the stack in an order they choose. If multiple players have triggers, the active player orders their triggers first, then each other player in turn order (APNAP).',
  },
  {
    id: 'legend-rule',
    title: 'Legend rule',
    answer: 'You choose one legendary permanent with that name and sacrifice the rest.',
    sourceTopics: ['legend-rule', 'state-based-actions'],
    any: [
      /legend rule/i,
      /two (?:legendary|copies|same)/i,
      /(clone|copy).*legendary/i,
      /control two .*legendary/i,
    ],
    explanation:
      'If you control two or more legendary permanents with the same name, you choose one and sacrifice the rest. This is a state-based action checked before anyone receives priority.',
  },
  {
    id: 'indestructible-damage',
    title: 'Indestructible and damage',
    answer: 'No — indestructible creatures do not die from lethal damage or destroy effects.',
    sourceTopics: ['keywords', 'state-based-actions', 'damage'],
    any: [
      /indestructible.*(damage|bolt|kill|destroy|lethal)/i,
      /(bolt|damage|destroy).*indestructible/i,
      /does indestructible/i,
    ],
    explanation:
      'Indestructible permanents can still be dealt damage and receive -1/-1 counters. They cannot be destroyed by damage or "destroy" effects. Lethal damage is marked but the creature does not die from damage.',
  },
  {
    id: 'hexproof-targeting',
    title: 'Hexproof and targeting',
    answer: 'No — your opponents cannot target a hexproof permanent with their spells or abilities.',
    sourceTopics: ['keywords', 'targeting'],
    any: [/hexproof.*target/i, /target.*hexproof/i, /can i target hexproof/i],
    explanation:
      'Hexproof means your opponents cannot target the permanent or player with spells or abilities. Your own spells can still target your hexproof permanents. Untargeted removal (e.g. board wipes) still works.',
  },
  {
    id: 'illegal-target-fizzle',
    title: 'All targets illegal on resolution',
    answer: 'The spell or ability fizzles — none of its effects happen.',
    sourceTopics: ['targeting', 'stack-resolution'],
    any: [
      /(all )?targets? illegal/i,
      /(spell|ability).*fizzle/i,
      /no legal target/i,
      /target.*(dies|gone|removed).*before.*resolve/i,
    ],
    explanation:
      'If a spell or ability requires targets and every target is illegal on resolution, it does not resolve. None of its effects happen (it "fizzles"). If it has some legal and some illegal targets, you remove illegal targets and resolve for the rest.',
  },
  {
    id: 'commander-dies',
    title: 'Commander dying',
    answer: 'Yes — you may send your commander to the command zone instead of the graveyard or exile.',
    sourceTopics: ['commander', 'zones'],
    any: [
      /commander (?:dies|died|death|destroyed|exiled)/i,
      /(dies|destroyed).*commander/i,
      /command zone|command zone/i,
    ],
    explanation:
      'When your commander dies or is exiled, you may send it to the command zone instead of the graveyard or exile. If you do, the next time you cast it from the command zone, it costs {2} more for each previous time you cast it from there this game (commander tax).',
  },
  {
    id: 'commander-damage',
    title: 'Commander combat damage',
    answer: 'Yes — 21 or more combat damage from the same commander causes that player to lose.',
    sourceTopics: ['commander', 'combat', 'damage'],
    any: [/commander damage/i, /21 damage.*commander/i, /lose.*commander damage/i],
    explanation:
      'In Commander, each player tracks damage taken from each individual commander. A player who has been dealt 21 or more combat damage by the same commander over the course of the game loses the game.',
  },
  {
    id: 'stack-response',
    title: 'Stack and responding',
    answer: 'Yes — you can respond whenever you have priority, before the top stack object resolves.',
    sourceTopics: ['priority-stack', 'stack-resolution'],
    any: [
      /stack/i,
      /respond|response|in response/i,
      /(can i|may i).*respond/i,
      /resolve first/i,
    ],
    explanation:
      'Spells and activated abilities use the stack. The player whose turn it is gets priority first, then each player in turn order. When all players pass in succession, the top stack object resolves. Instants and flash can be cast whenever you have priority.',
  },
  {
    id: 'mana-abilities',
    title: 'Mana abilities',
    answer: 'No — you cannot respond to mana abilities; they resolve immediately.',
    sourceTopics: ['mana-abilities', 'priority-stack'],
    any: [/mana abilit/i, /(tap|add mana).*stack/i, /floating mana/i],
    explanation:
      'Mana abilities do not use the stack and resolve immediately. You cannot respond to someone tapping a land for mana. Floating mana empties at end of each step and phase unless an effect says otherwise.',
  },
  {
    id: 'land-drops',
    title: 'Land drops',
    answer: 'One land per turn by default, during your main phase while the stack is empty.',
    sourceTopics: ['lands'],
    any: [/play (?:a |an |extra )?land/i, /land drop/i, /how many lands per turn/i],
    explanation:
      'During your main phase, if the stack is empty, you may play one land per turn by default. Effects that let you play additional lands modify that number. Playing a land does not use the stack.',
  },
  {
    id: 'sba-death',
    title: 'Creature death (state-based actions)',
    answer: 'The creature dies when it has 0 or less toughness, or lethal damage (unless indestructible).',
    sourceTopics: ['state-based-actions', 'damage'],
    any: [
      /(zero|0) toughness/i,
      /lethal damage/i,
      /when does .* die/i,
      /state.based/i,
    ],
    explanation:
      'A creature dies (state-based actions) if it has 0 or less toughness, or if it has damage marked on it greater than or equal to its toughness (unless indestructible). SBAs are checked before any player would receive priority.',
  },
  {
    id: 'plus-minus-counters',
    title: '+1/+1 and -1/-1 counters',
    answer: 'Pairs of +1/+1 and -1/-1 counters on the same permanent are removed as a state-based action.',
    sourceTopics: ['counters-on-permanents', 'state-based-actions'],
    any: [/\+1\/\+1.*-1\/-1/i, /minus.*plus.*counter/i, /counter.*cancel/i],
    explanation:
      'If a permanent has both +1/+1 and -1/-1 counters on it, pairs of them are removed as a state-based action until only one type remains.',
  },
  {
    id: 'replacement-vs-prevention',
    title: 'Replacement vs prevention effects',
    answer: '"Instead" effects replace the event; prevention stops damage that would be dealt.',
    sourceTopics: ['replacement-prevention'],
    any: [/replacement effect/i, /instead/i, /prevent damage/i, /would (?:take|receive|be dealt) damage/i],
    explanation:
      '"Instead" effects are replacement effects — they change how an event happens. Prevention effects stop damage that would be dealt. Replacement effects apply before the event occurs; only one replacement effect applies to each event.',
  },
  {
    id: 'copy-spell',
    title: 'Copying spells',
    answer: 'A copy resolves as a copy of the original — it is not cast and does not trigger "when you cast" abilities.',
    sourceTopics: ['copy-effects', 'stack-resolution'],
    any: [/copy (?:a |the |that )?spell/i, /twincast|copy.*(instant|sorcery)/i],
    explanation:
      'A copy of a spell is not cast — you do not pay its mana cost. It copies the choices made for the original (modes, targets, X values). If the copy is countered, the original is unaffected.',
  },
  {
    id: 'split-second',
    title: 'Split second',
    answer: 'No — while a split second spell is on the stack, players cannot cast spells or activate non-mana abilities.',
    sourceTopics: ['keywords', 'priority-stack'],
    any: [/split second/i],
    explanation:
      'While a spell with split second is on the stack, players cannot cast spells or activate abilities that are not mana abilities. Triggered abilities can still trigger and go on the stack after split second resolves.',
  },
  {
    id: 'color-identity',
    title: 'Commander color identity',
    answer: 'Every card in your deck must fit within your commander\'s color identity.',
    sourceTopics: ['color-identity'],
    any: [/color identity/i, /(off|outside|illegal).*color/i, /hybrid.*identity/i],
    explanation:
      'A card\'s color identity is all mana symbols in its mana cost and rules text, including reminder text and hybrid symbols. In Commander, every card in your deck must fit within your commander\'s color identity.',
  },
  {
    id: 'mulligan',
    title: 'Mulligans',
    answer: 'Draw 7, then mulligan down by one card each time until you keep (Vancouver mulligan — confirm with your table).',
    sourceTopics: ['mulligans'],
    any: [/mulligan/i, /opening hand/i, /starting (?:hand|size)/i],
    explanation:
      'Commander uses the Vancouver mulligan by default in most playgroups: draw 7, optionally mulligan by shuffling your hand into your library and drawing one fewer card, repeat. First player does not draw on their first turn.',
    note: 'Some tables use the London mulligan or free first mulligan — confirm with your playgroup.',
  },
  {
    id: 'combat-damage-order',
    title: 'Combat damage assignment',
    answer: 'The attacker assigns damage among blockers; trample lets excess damage go to the player or planeswalker.',
    sourceTopics: ['combat'],
    any: [
      /(assign|assignment).*combat damage/i,
      /trample.*block/i,
      /order of blockers/i,
    ],
    explanation:
      'The attacking player assigns combat damage among blocking creatures. Excess damage can be assigned to the player or planeswalker being attacked if the attacker has trample. Deathtouch with trample assigns at least 1 damage to each blocker.',
  },
  {
    id: 'lifelink',
    title: 'Lifelink',
    answer: 'Yes — you gain life equal to the damage dealt at the same time the damage is dealt.',
    sourceTopics: ['keywords', 'damage'],
    any: [/lifelink/i, /gain life.*damage/i],
    explanation:
      'Damage dealt by a source with lifelink causes its controller to gain that much life at the same time the damage is dealt.',
  },
  {
    id: 'infect-poison',
    title: 'Infect and poison counters',
    answer: 'Yes — 10 poison counters causes a player to lose the game.',
    sourceTopics: ['keywords', 'counters-on-permanents', 'state-based-actions'],
    any: [/infect/i, /poison counter/i, /10 poison/i],
    explanation:
      'Infect damage to players gives poison counters instead of life loss. A player with 10 or more poison counters loses the game. Infect damage to creatures gives -1/-1 counters.',
  },
  {
    id: 'persist-undying',
    title: 'Persist / undying',
    answer: 'The creature returns only if it had no -1/-1 counter (persist) or no +1/+1 counter (undying) when it died.',
    sourceTopics: ['keywords', 'zones', 'triggered-abilities'],
    any: [/persist/i, /undying/i, /-1\/-1 counter.*return/i],
    explanation:
      'Persist: when a creature with persist dies, if it had no -1/-1 counters, return it to the battlefield with a -1/-1 counter. Undying is the opposite with +1/+1 counters. They do not trigger if the counter condition is not met.',
  },
  {
    id: 'layers',
    title: 'Layer system (continuous effects)',
    answer: 'Apply effects in layer order: copy → control → text → type → color → ability → P/T, then timestamp within a layer.',
    sourceTopics: ['layers'],
    any: [/layer/i, /(humility|blood moon|depend.*timestamp)/i, /which effect applies/i],
    explanation:
      'Continuous effects apply in layers: copy, control, text, type, color, ability, power/toughness, then timestamp within a layer. Dependent effects may be ordered differently.',
    note: 'Complex layer questions need the exact permanents involved — list every card on the battlefield.',
  },
  {
    id: 'dies-vs-leave',
    title: '"Dies" vs "leaves the battlefield"',
    answer: 'No — exiling or bouncing a creature does not trigger "dies" abilities.',
    sourceTopics: ['zones', 'triggered-abilities'],
    any: [/dies vs leave/i, /(exile|bounce).*dies trigger/i, /leave.*(trigger|dies)/i],
    explanation:
      '"Dies" means "is put into a graveyard from the battlefield." Exiling, bouncing, or flickering a creature does not cause dies triggers. "Leaves the battlefield" triggers on any zone change away from the battlefield.',
  },
  {
    id: 'activate-before-resolve',
    title: 'Activated abilities vs triggered abilities',
    answer: 'Activated abilities use the stack; triggered abilities go on the stack automatically after the event.',
    sourceTopics: ['activated', 'triggered-abilities'],
    any: [
      /activated.*trigger/i,
      /(tap|activate).*ability.*(priority|when)/i,
    ],
    explanation:
      'Activated abilities (written "Cost: Effect") use the stack like instants unless they are mana abilities. Triggered abilities (start with When/Whenever/At) go on the stack automatically after the triggering event.',
  },
]

function scoreRule(entry: RuleEntry, text: string): number {
  let score = entry.weight ?? 0

  if (entry.all) {
    if (!entry.all.every((re) => re.test(text))) return 0
    score += entry.all.length * 15
  }

  for (const re of entry.any) {
    if (re.test(text)) score += 10
  }

  return score
}

function buildSources(topicKeys: string[]): RuleSource[] {
  const seen = new Set<string>()
  const sources: RuleSource[] = []

  for (const key of topicKeys) {
    if (seen.has(key)) continue
    const topic = SOURCE_TOPICS[key]
    if (!topic) continue
    seen.add(key)
    sources.push({
      topic: formatTopicLabel(key),
      summary: topic.summary,
      citations: topic.citations,
    })
  }

  return sources
}

function formatTopicLabel(key: string): string {
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function crSectionUrl(citation: string): string {
  const section = citation.replace(/^CR\s+/i, '').split(/[\s,]/)[0]
  return `https://yawgatog.com/resources/magic-rules/#R${section}`
}

function mergeSourceTopics(matches: Array<{ entry: RuleEntry; score: number }>): string[] {
  const keys: string[] = []
  for (const match of matches) {
    for (const key of match.entry.sourceTopics) {
      if (!keys.includes(key)) keys.push(key)
    }
  }
  return keys
}

export function clarifyRules(scenario: string): RuleClarification {
  const { text, corrections } = normalizeWithTypos(scenario)

  if (text.length < 8) {
    return {
      answer: 'Need more detail to give a definitive ruling.',
      title: 'Describe the sequence',
      explanation:
        'Walk through what happened step by step — what was cast, what triggered, and what each player tried to do in response.',
      sources: buildSources(['priority-stack', 'triggered-abilities', 'stack-resolution']),
      confidence: 'low',
    }
  }

  const scored = RULES.map((entry) => ({
    entry,
    score: scoreRule(entry, text),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0 || scored[0].score < 10) {
    return {
      answer: 'Cannot give a definitive ruling without a closer match — add card names and the exact order of actions.',
      title: 'Insufficient detail',
      explanation:
        'Identify what triggered and what was cast in response. Check whether targets were legal when the spell or ability resolved. State-based actions happen before anyone gets priority.',
      steps: [
        'List every spell and ability in the order they were put on the stack.',
        'Note which targets were chosen and whether they were still legal on resolution.',
        'Check for replacement effects ("instead") before the event happens.',
      ],
      sources: buildSources(['priority-stack', 'triggered-abilities', 'stack-resolution', 'state-based-actions']),
      confidence: 'low',
      note: corrections.length > 0 ? `Interpreted: ${corrections.join(', ')}` : undefined,
    }
  }

  const best = scored[0]
  const confidence: RuleClarification['confidence'] =
    best.score >= 25 ? 'high' : best.score >= 15 ? 'medium' : 'low'

  const relatedMatches = scored.filter((s) => s.score >= best.score * 0.7).slice(0, 3)
  const sourceTopics = mergeSourceTopics(relatedMatches)

  const related =
    scored.length > 1 && scored[1].score >= best.score * 0.7
      ? `Also relevant: ${scored[1].entry.title}`
      : undefined

  return {
    answer: best.entry.answer,
    title: best.entry.title,
    explanation: best.entry.explanation,
    steps: best.entry.steps,
    sources: buildSources(sourceTopics),
    confidence,
    note: [corrections.length > 0 ? `Interpreted: ${corrections.join(', ')}` : '', related, best.entry.note]
      .filter(Boolean)
      .join(' · ') || undefined,
  }
}
