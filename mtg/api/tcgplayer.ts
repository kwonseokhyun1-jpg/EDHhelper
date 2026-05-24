const TCGPLAYER_ORIGIN = 'https://infinite-api.tcgplayer.com'

type VercelRequest = {
  method?: string
  query: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
  send: (body: string) => void
  setHeader: (name: string, value: string) => void
}

function buildUpstreamUrl(req: VercelRequest): string | null {
  const rawPath = req.query.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath?.trim()
  if (!path) return null

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || value == null) continue
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    } else {
      params.set(key, value)
    }
  }

  const qs = params.toString()
  return `${TCGPLAYER_ORIGIN}/${path}${qs ? `?${qs}` : ''}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept')

  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const upstreamUrl = buildUpstreamUrl(req)
  if (!upstreamUrl) {
    return res.status(400).json({ error: { message: 'Missing TCGPlayer API path.' } })
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        Origin: 'https://www.tcgplayer.com',
        Referer: 'https://www.tcgplayer.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    })

    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    res.status(upstream.status).send(body)
  } catch {
    res.status(502).json({ error: { message: 'Could not reach TCGPlayer API.' } })
  }
}
