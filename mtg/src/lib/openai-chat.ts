export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function hasOpenAiConfigured(): boolean {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  return Boolean(key?.trim())
}

/** OpenAI blocks browser CORS — use the Vite dev proxy locally only. */
export function canUseOpenAi(): boolean {
  return import.meta.env.DEV && hasOpenAiConfigured()
}

function openaiApiUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/openai/chat/completions`
}

function formatOpenAiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { type?: string; message?: string; code?: string }
    }
    const err = parsed.error
    if (status === 429 || err?.type === 'insufficient_quota' || err?.code === 'insufficient_quota') {
      return [
        '**OpenAI billing quota exceeded.**',
        '',
        'Your API key has no remaining credits. Add billing or top up at [platform.openai.com/account/billing](https://platform.openai.com/account/billing), or use a key with available quota.',
        '',
        err?.message ?? 'Rate limit / quota error from OpenAI.',
      ].join('\n')
    }
    if (status === 401) {
      return '**Invalid OpenAI API key.** Check `VITE_OPENAI_API_KEY` in `.env.local` and restart `npm run dev`.'
    }
    if (err?.message) return `**OpenAI error:** ${err.message}`
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
      'The Assistant proxy only runs with `npm run dev`. Run locally, or check that the dev server is running.',
    ].join('\n')
  }
  return err instanceof Error ? err.message : 'Unknown AI error'
}

export async function chatCompletion(options: {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}): Promise<string> {
  if (!canUseOpenAi()) {
    throw new Error(
      [
        '**Assistant is only available in local dev.**',
        '',
        'Run `npm run dev` with `VITE_OPENAI_API_KEY` in `.env.local`. OpenAI cannot be called directly from the GitHub Pages site.',
      ].join('\n'),
    )
  }

  let res: Response
  try {
    res = await fetch(openaiApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.max_tokens ?? 1500,
      }),
    })
  } catch (err) {
    throw new Error(formatNetworkError(err))
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(formatOpenAiError(res.status, err))
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')
  return content
}
