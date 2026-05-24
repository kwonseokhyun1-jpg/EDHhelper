import { useRef, useState } from 'react'
import {
  CHAT_STARTERS,
  hasJudgeAi,
  replyToJudge,
  type JudgeChatMessage,
} from '../lib/judge-chat'

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ))
  })
}

export function JudgeChat() {
  const aiEnabled = hasJudgeAi()
  const [messages, setMessages] = useState<JudgeChatMessage[]>([
    {
      role: 'assistant',
      content: aiEnabled
        ? 'Ask me anything Magic-related — rules, decks, cards, strategy, or lore.'
        : 'Add VITE_OPENAI_API_KEY to .env.local and restart npm run dev to enable the assistant.',
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const userMsg: JudgeChatMessage = { role: 'user', content: trimmed }
    const history = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)

    try {
      const reply = await replyToJudge(trimmed, history)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: e instanceof Error ? e.message : 'Something went wrong. Try rephrasing your question.',
        },
      ])
    } finally {
      setThinking(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
        Assistant
      </h2>
      <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
        {aiEnabled
          ? 'Powered by GPT-4o mini — rules, decks, upgrades, and general MTG help.'
          : 'Configure an OpenAI API key in .env.local to enable AI answers.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CHAT_STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => send(starter)}
            disabled={thinking}
            className="rounded-full border border-[var(--color-mtg-border)] px-2.5 py-0.5 text-[10px] text-[var(--color-mtg-muted)] hover:border-[var(--color-mtg-gold-dim)] disabled:opacity-50"
          >
            {starter}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] p-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'ml-8 bg-[var(--color-mtg-gold)]/15 text-white'
                : 'mr-8 bg-[var(--color-mtg-panel)] text-[var(--color-mtg-text)]'
            }`}
          >
            {renderContent(msg.content)}
          </div>
        ))}
        {thinking && (
          <p className="text-sm text-[var(--color-mtg-muted)] animate-pulse">Thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask about rules, decks, cards, strategy…"
          disabled={thinking}
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={thinking || !input.trim()}
          className="self-end rounded-lg bg-[var(--color-mtg-gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </section>
  )
}
