export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

function groqApiUrl(): string {
  const externalBase = import.meta.env.VITE_GROQ_API_BASE as string | undefined
  if (externalBase?.trim()) {
    return `${externalBase.trim().replace(/\/$/, '')}/api/groq`
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/groq`
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
    if (status === 405) {
      return [
        '**Assistant unavailable on this host.**',
        '',
        'GitHub Pages is static-only and cannot run the Groq API proxy.',
        'Use [edhhelp.vercel.app](https://edhhelp.vercel.app), run `npm run dev` locally, or set `VITE_GROQ_API_BASE` to a Vercel deployment when building for Pages.',
      ].join('\n')
    }
    if (err?.message) return `**Groq error:** ${err.message}`
  } catch {
    /* use raw body */
  }
  if (status === 405 && /<html/i.test(body)) {
    return [
      '**Assistant unavailable on this host.**',
      '',
      'This site cannot handle AI API requests (static hosting returned 405).',
      'Use [edhhelp.vercel.app](https://edhhelp.vercel.app) or run `npm run dev` locally with `GROQ_API_KEY` in `.env.local`.',
    ].join('\n')
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

export class GroqChatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroqChatError'
  }
}

export async function chatCompletion(options: {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
}): Promise<string> {
  let res: Response
  try {
    const body: Record<string, unknown> = {
      model: options.model ?? DEFAULT_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1200,
    }
    if (options.response_format) body.response_format = options.response_format

    res = await fetch(groqApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new GroqChatError(formatNetworkError(err))
  }

  if (!res.ok) {
    const err = await res.text()
    throw new GroqChatError(formatGroqError(res.status, err))
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new GroqChatError('Empty AI response')
  return content
}

export function groqErrorMessage(err: unknown): string {
  if (err instanceof GroqChatError) return err.message
  if (err instanceof Error) return err.message
  return 'Unknown AI error'
}

export function formatGroqUnavailableNote(error?: string): string {
  if (!error) {
    return 'Groq unavailable — using local matching only. Run `npm run dev` from the mtg folder with GROQ_API_KEY in `.env.local`, or use a Vercel deployment with the API configured.'
  }
  const plain = error.replace(/\*\*/g, '').replace(/\n+/g, ' ').trim()
  return `Groq unavailable — using local matching only. ${plain}`
}
