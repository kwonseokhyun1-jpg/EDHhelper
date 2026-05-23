import { useRef, useState } from 'react'
import { replyToJudge, type JudgeChatMessage } from '../lib/judge-chat'

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
  const [messages, setMessages] = useState<JudgeChatMessage[]>([
    {
      role: 'assistant',
      content:
        'I\'m your Commander rules judge. Describe a game situation or ask how a mechanic works — I\'ll give a definitive ruling with sources when I can.',
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
        Ask the Judge
      </h2>
      <p className="mt-1 text-sm text-[var(--color-mtg-muted)]">
        In-depth rules help for Commander — stack, layers, triggers, and more.
      </p>

      <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] p-3">
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
          <p className="text-sm text-[var(--color-mtg-muted)] animate-pulse">Reviewing the rules…</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask a rules question…"
          disabled={thinking}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={thinking || !input.trim()}
          className="rounded-lg bg-[var(--color-mtg-gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </section>
  )
}
