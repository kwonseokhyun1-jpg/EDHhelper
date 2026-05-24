export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

function groqApiUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/groq/chat/completions`
}

function formatGroqError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; type?: string; code?: string }
    }
    const err = parsed.error
    if (status === 429) {
      return [
        '**Groq rate limit reached.**',
        '',
        'Wait a moment and try again. Free-tier limits apply.',
        '',
        err?.message ?? 'Too many requests.',
      ].join('\n')
    }
    if (status === 401) {
      return '**Invalid Groq API key.** Set `GROQ_API_KEY` in `.env.local` (local) or Vercel environment variables.'
    }
    if (status === 503) {
      return '**Assistant unavailable.** Groq API key is not configured on this deployment.'
    }
    if (err?.message) return `**Groq error:** ${err.message}`
  } catch {
    /* use raw body */
  }
  return `AI request failed (${status}): ${body.slice(0, 200)}`
}

function formatNetworkError(err: unknown): string {
  if (err instanceof TypeError || (err instanceof Error && /failed to fetch/i.test(err.message))) {
    return [
      '**Could not reach the AI service (network error).**',
      '',
      'Run locally with `npm run dev` and `GROQ_API_KEY` in `.env.local`, or use the Vercel deployment with the key configured.',
    ].join('\n')
  }
  return err instanceof Error ? err.message : 'Unknown AI error'
}

export async function chatCompletion(options: {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}): Promise<string> {
  let res: Response
  try {
    res = await fetch(groqApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.max_tokens ?? 1200,
      }),
    })
  } catch (err) {
    throw new Error(formatNetworkError(err))
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(formatGroqError(res.status, err))
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')
  return content
}
