import { commanderEdhrecUrl } from './edhrec'

export type EdhrecCardRef = {
  name: string
  synergy: number
  inclusion: number
}

export type EdhrecCommanderPage = {
  commanderName: string
  avgLandCount: number
  avgNonbasicLands: number
  combos: string[]
  highSynergy: EdhrecCardRef[]
  utilityLands: EdhrecCardRef[]
  manaArtifacts: EdhrecCardRef[]
  lands: EdhrecCardRef[]
  edhrecUrl: string
}

function commanderSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseCardviews(list: {
  cardviews?: Array<{
    name?: string
    synergy?: number
    inclusion?: number
  }>
}): EdhrecCardRef[] {
  return (list.cardviews ?? [])
    .filter((c) => c.name)
    .map((c) => ({
      name: c.name!,
      synergy: c.synergy ?? 0,
      inclusion: c.inclusion ?? 0,
    }))
}

function findCardlist(
  lists: Array<{
    header?: string
    tag?: string
    cardviews?: Array<{
      name?: string
      synergy?: number
      inclusion?: number
    }>
  }>,
  match: RegExp,
): EdhrecCardRef[] {
  const list = lists.find(
    (l) => match.test(l.header ?? '') || match.test(l.tag ?? ''),
  )
  return list ? parseCardviews(list) : []
}

export async function fetchCommanderEdhrecPage(
  commanderName: string,
): Promise<EdhrecCommanderPage | null> {
  const slug = commanderSlug(commanderName)
  if (!slug) return null

  try {
    const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      land?: number
      nonbasic?: number
      panels?: {
        combocounts?: Array<{ value?: string; alt?: string }>
      }
      container?: {
        json_dict?: {
          cardlists?: Array<{
            header?: string
            tag?: string
            cardviews?: Array<{
              name?: string
              synergy?: number
              inclusion?: number
            }>
          }>
        }
      }
    }

    const lists = data.container?.json_dict?.cardlists ?? []
    const combos = (data.panels?.combocounts ?? [])
      .map((c) => c.value ?? c.alt ?? '')
      .filter((v) => v && !/^see more/i.test(v))

    return {
      commanderName,
      avgLandCount: data.land ?? 37,
      avgNonbasicLands: data.nonbasic ?? 20,
      combos,
      highSynergy: findCardlist(lists, /high synergy/i),
      utilityLands: findCardlist(lists, /utility lands/i),
      manaArtifacts: findCardlist(lists, /mana artifacts/i),
      lands: findCardlist(lists, /^lands$/i),
      edhrecUrl: commanderEdhrecUrl(commanderName),
    }
  } catch {
    return null
  }
}
