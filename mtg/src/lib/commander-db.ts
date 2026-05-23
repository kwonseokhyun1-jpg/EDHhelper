import type { CommanderDatabase } from '../types/commander'

let cache: CommanderDatabase | null = null

export async function loadCommanderDatabase(): Promise<CommanderDatabase> {
  if (cache) return cache

  const res = await fetch(`${import.meta.env.BASE_URL}data/commanders.json`)
  if (!res.ok) {
    throw new Error(
      'Commander database not found. Run npm run build:commanders to generate it.',
    )
  }

  cache = (await res.json()) as CommanderDatabase
  return cache
}

export function clearCommanderCache() {
  cache = null
}
