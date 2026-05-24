import type { CommanderDatabase, CommanderRecord } from '../types/commander'
import { fetchJsonAsset } from './assets'
import { parseCreatureTypes } from './commander-tribes'

let cache: CommanderDatabase | null = null

function normalizeCommander(c: CommanderRecord): CommanderRecord {
  return {
    ...c,
    creature_types: c.creature_types?.length
      ? c.creature_types
      : parseCreatureTypes(c.type_line),
  }
}

export async function loadCommanderDatabase(): Promise<CommanderDatabase> {
  if (cache) return cache

  cache = await fetchJsonAsset<CommanderDatabase>('data/commanders.json', 'Commander database')
  cache = {
    ...cache,
    commanders: cache.commanders.map(normalizeCommander),
  }
  return cache
}

export function clearCommanderCache() {
  cache = null
}
