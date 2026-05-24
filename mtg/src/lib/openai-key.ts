import { hasOpenAiConfigured } from './openai-chat'

export function getOpenAiKey(): string | undefined {
  const fromEnv = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  return fromEnv?.trim() || undefined
}

export function hasOpenAiKey(): boolean {
  return hasOpenAiConfigured()
}
