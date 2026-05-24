import { useRef, useState } from 'react'
import {
  CHAT_STARTERS,
  replyToJudge,
  type JudgeChatMessage,
} from '../lib/judge-chat'

function renderContent(text: string) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: Array<{ type: 'text' | 'link'; content: string; href?: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'link', content: match[1], href: match[2] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  const renderText = (chunk: string, keyPrefix: string) => {
    const boldParts = chunk.split(/(\*\*[^*]+\*\*)/g)
    return boldParts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>
      }
      return part.split('\n').map((line, j, arr) => (
        <span key={`${keyPrefix}-l-${i}-${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </span>
      ))
    })
  }

  return parts.map((part, i) =>
    part.type === 'link' ? (
      <a
        key={`link-${i}`}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-mtg-gold)] underline"
      >
        {part.content}
      </a>
    ) : (
      <span key={`text-${i}`}>{renderText(part.content, `t-${i}`)}</span>
    ),
  )
}

export function JudgeChat() {
  const [messages, setMessages] = useState<JudgeChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ask anything Magic-related — rules, decks, cards, or strategy. Powered by Groq (Llama). Not official judge rulings.',
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
        AI assistant for Commander — helpful for rules and deck advice, not official Oracle or judge rulings.
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
