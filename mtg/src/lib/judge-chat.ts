import { canUseOpenAi, chatCompletion } from './openai-chat'

export type JudgeChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const ASSISTANT_SYSTEM_PROMPT = `You are a friendly, knowledgeable Magic: The Gathering assistant.

You can answer ANY question related to Magic: The Gathering, including:
- Rules, stack interactions, and tournament policy
- Commander / EDH deck building, upgrades, mana bases, and strategy
- Card recommendations, staples, combos, and archetypes
- Format legality, color identity, banned lists
- Lore, set history, product questions, and casual play advice
- General questions that mention Magic cards or concepts

If a question is not about Magic, politely say you only help with MTG topics.

When answering rules questions, be accurate — cite Comprehensive Rules sections when confident (e.g. CR 603.2). Never invent card text.

Write clearly. Use **bold** for key takeaways. Use bullet lists when helpful. Be practical and conversational.`

const CHAT_STARTERS = [
  'Does lifelink use the stack?',
  'What are good ramp options in Golgari?',
  'Explain the layer system with Humility and Blood Moon.',
  'How does commander damage work in multiplayer?',
  'Suggest upgrades for an Atraxa counters deck.',
]

export { CHAT_STARTERS }

export function hasJudgeAi(): boolean {
  return canUseOpenAi()
}

export async function replyToJudge(
  userMessage: string,
  history: JudgeChatMessage[],
): Promise<string> {
  const text = userMessage.trim()
  if (!text) return 'Ask anything about Magic — rules, decks, cards, or strategy.'

  if (!canUseOpenAi()) {
    return [
      '**Assistant is not configured.**',
      '',
      import.meta.env.DEV
        ? 'Add `VITE_OPENAI_API_KEY=sk-…` to `.env.local` in the project root, then restart the dev server (`npm run dev`).'
        : 'The Assistant runs with `npm run dev` locally. OpenAI cannot be called from the static GitHub Pages site.',
    ].join('\n')
  }

  const conversation = [
    ...history.filter((m) => m.role === 'user' || m.role === 'assistant'),
    { role: 'user' as const, content: text },
  ]

  try {
    return await chatCompletion({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 1500,
      messages: [{ role: 'system', content: ASSISTANT_SYSTEM_PROMPT }, ...conversation],
    })
  } catch (e) {
    return e instanceof Error ? e.message : 'Unknown AI error'
  }
}

export function renderJudgeMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}
