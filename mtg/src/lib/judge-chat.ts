import { clarifyRules, crSectionUrl, type RuleClarification } from './rules-clarifier'
import { detectKeywordsInText, keywordById } from './mtg-keywords'

export type JudgeChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const JUDGE_SYSTEM_PROMPT = `You are an expert Magic: The Gathering rules judge specializing in Commander (EDH).

Rules for your answers:
- Give a definitive ruling first, then explain why.
- Cite Comprehensive Rules sections when relevant (format: CR 603.2).
- Never invent card text or abilities — if you need exact wording, say so.
- For layers, stack, triggers, SBAs, and targeting, be precise.
- If the scenario is ambiguous, list what info you need (exact sequence, targets, timestamps).
- Commander-specific: color identity, commander tax, commander damage, command zone.
- Do not give deck-building advice unless asked — focus on rules and interactions.`

const CHAT_STARTERS = [
  'Does an ETB trigger happen if the creature spell is countered?',
  'Explain the layer system with Humility and Blood Moon.',
  'How does commander damage work in multiplayer?',
  'What happens when all targets are illegal on resolution?',
]

export { CHAT_STARTERS }

function formatRulingReply(ruling: RuleClarification): string {
  const parts = [`**${ruling.answer}**`, '', ruling.explanation]

  if (ruling.steps?.length) {
    parts.push('', '**Step by step:**')
    for (const step of ruling.steps) {
      parts.push(`• ${step}`)
    }
  }

  if (ruling.sources.length > 0) {
    parts.push('', '**Sources:**')
    for (const source of ruling.sources) {
      const cites = source.citations.join(', ')
      parts.push(`• ${source.topic}: ${cites}`)
    }
  }

  if (ruling.note) {
    parts.push('', `_${ruling.note}_`)
  }

  if (ruling.confidence !== 'high') {
    parts.push(
      '',
      '_For tournament play, confirm unusual interactions with a certified judge._',
    )
  }

  return parts.join('\n')
}

function tryKeywordReply(text: string): string | null {
  const kws = detectKeywordsInText(text)
  if (kws.length === 0) return null

  const lines = kws.map((k) => `**${k.name}** — ${k.meaning}`)
  return ['Here is what those keywords mean in the rules:', '', ...lines].join('\n')
}

function tryDefinitionReply(text: string): string | null {
  const lower = text.toLowerCase()
  const defs: Array<{ match: RegExp; reply: string }> = [
    {
      match: /what (?:is|are) (?:the )?stack/i,
      reply:
        '**The stack** is where spells and abilities wait to resolve. Players get priority in turn order; when all pass, the top object resolves (CR 405, CR 608).',
    },
    {
      match: /what (?:is|are) (?:a )?state.based/i,
      reply:
        '**State-based actions** are checked automatically before any player gets priority — e.g. a creature with lethal damage dies, the legend rule, poison counters at 10 (CR 704).',
    },
    {
      match: /what (?:is|are) (?:the )?layer/i,
      reply:
        '**Layers** determine how continuous effects apply: copy → control → text → type → color → ability → P/T, then timestamp within a layer (CR 613). Dependent effects may order differently (CR 613.8).',
    },
    {
      match: /commander tax/i,
      reply:
        '**Commander tax:** Each time you cast your commander from the command zone, it costs {2} more for each previous cast from the command zone this game (CR 903.8).',
    },
    {
      match: /apnap/i,
      reply:
        '**APNAP order** (Active Player, Non-Active Player): When multiple players put triggers on the stack at once, the active player orders and stacks theirs first, then each other player in turn order (CR 603.3b).',
    },
  ]

  for (const { match, reply } of defs) {
    if (match.test(lower)) return reply
  }

  for (const kw of detectKeywordsInText(text)) {
    if (lower.includes(kw.name.toLowerCase()) || kw.aliases.some((a) => lower.includes(a))) {
      return `**${kw.name}** — ${kw.meaning}`
    }
  }

  return null
}

async function callOpenAI(messages: JudgeChatMessage[]): Promise<string> {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!key) throw new Error('OpenAI not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [{ role: 'system', content: JUDGE_SYSTEM_PROMPT }, ...messages],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Judge AI unavailable (${res.status}): ${err.slice(0, 120)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response from judge AI.'
}

export async function replyToJudge(
  userMessage: string,
  history: JudgeChatMessage[],
): Promise<string> {
  const text = userMessage.trim()
  if (!text) return 'Ask a rules question — describe what happened in your game.'

  const ruling = clarifyRules(text)
  if (ruling.confidence === 'high') {
    return formatRulingReply(ruling)
  }

  const definition = tryDefinitionReply(text)
  if (definition) return definition

  const keywordReply = tryKeywordReply(text)
  if (keywordReply && ruling.confidence === 'low') {
    return keywordReply
  }

  if (ruling.confidence === 'medium') {
    return formatRulingReply(ruling)
  }

  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (openaiKey) {
    try {
      return await callOpenAI([...history, { role: 'user', content: text }])
    } catch {
      /* fall through to local */
    }
  }

  if (ruling.confidence === 'low' && ruling.title !== 'Insufficient detail') {
    return formatRulingReply(ruling)
  }

  return [
    'I need a clearer picture to give a definitive ruling. Include:',
    '• Exact card names involved',
    '• What was on the stack, in order',
    '• What each player did in response',
    '• Whether targets were still legal when the spell/ability resolved',
    '',
    ruling.confidence === 'low' ? formatRulingReply(ruling) : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function renderJudgeMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}

export function sourceLinksFromRuling(ruling: RuleClarification): Array<{ cite: string; url: string }> {
  const links: Array<{ cite: string; url: string }> = []
  for (const source of ruling.sources) {
    for (const cite of source.citations) {
      links.push({ cite, url: crSectionUrl(cite) })
    }
  }
  return links
}

export function explainKeyword(id: string): string | undefined {
  return keywordById(id)?.meaning
}
