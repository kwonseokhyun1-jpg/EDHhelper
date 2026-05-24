import { chatCompletion, type ChatMessage } from './groq-chat'

export type JudgeChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const CHAT_STARTERS = [
  'Does lifelink use the stack?',
  'What are good ramp options in Golgari?',
  'Explain the layer system with Humility and Blood Moon.',
  'How does commander damage work in multiplayer?',
  'Suggest upgrades for an Atraxa counters deck.',
]

const JUDGE_SYSTEM = `You are a knowledgeable Magic: The Gathering assistant focused on Commander (EDH).

Answer rules questions using current Comprehensive Rules concepts. For card-specific rules, describe Oracle text behavior. If a ruling depends on layers, the stack, or timestamps, explain briefly.

For deck and strategy questions, give practical Commander advice.

Be concise: short paragraphs or bullet points when helpful. If uncertain about a niche rules interaction, say so and suggest checking the Oracle or a judge.

Do not claim to be an official Wizards judge. Do not invent card names or abilities.`

export { CHAT_STARTERS }

export function hasJudgeAi(): boolean {
  return true
}

function toGroqMessages(history: JudgeChatMessage[], userMessage: string): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: JUDGE_SYSTEM }]

  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: userMessage })
  return messages
}

export async function replyToJudge(
  userMessage: string,
  history: JudgeChatMessage[],
): Promise<string> {
  try {
    return await chatCompletion({
      messages: toGroqMessages(history, userMessage),
      temperature: 0.4,
      max_tokens: 1200,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not reach the AI service.'
    return [
      '**Could not get an answer.**',
      '',
      msg,
      '',
      'Try again in a moment, or rephrase your question with more specific MTG terms.',
    ].join('\n')
  }
}

export function renderJudgeMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--color-mtg-gold)] underline">$1</a>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}
