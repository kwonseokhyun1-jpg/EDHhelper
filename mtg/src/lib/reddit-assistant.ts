const MTG_SUBREDDITS = ['magicTCG', 'EDH', 'askmagicjudges'] as const

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'how', 'when',
  'where', 'why', 'who', 'which', 'that', 'this', 'these', 'those', 'it', 'its', 'i', 'me',
  'my', 'you', 'your', 'we', 'they', 'their', 'about', 'from', 'into', 'than', 'then',
])

export type RedditPost = {
  id: string
  title: string
  selftext: string
  subreddit: string
  score: number
  numComments: number
  permalink: string
  url: string
}

type RedditListing<T> = {
  data?: {
    children?: Array<{ data: T }>
  }
}

type RedditPostRaw = {
  id: string
  title: string
  selftext: string
  subreddit: string
  score: number
  num_comments: number
  permalink: string
  url: string
}

type RedditCommentRaw = {
  body?: string
  score?: number
}

function redditPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function proxyUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '')
  return `${base}/api/reddit${redditPath(path)}`
}

async function fetchRedditJson<T>(path: string): Promise<T> {
  const normalized = redditPath(path)
  const urls = [
    proxyUrl(normalized),
    `https://corsproxy.io/?${encodeURIComponent(`https://www.reddit.com${normalized}`)}`,
  ]

  let lastError: Error | null = null

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        lastError = new Error(`Reddit request failed (${res.status})`)
        continue
      }
      return (await res.json()) as T
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error')
    }
  }

  throw lastError ?? new Error('Could not reach Reddit.')
}

function normalizePost(raw: RedditPostRaw): RedditPost {
  return {
    id: raw.id,
    title: raw.title.trim(),
    selftext: raw.selftext.trim(),
    subreddit: raw.subreddit,
    score: raw.score,
    numComments: raw.num_comments,
    permalink: `https://www.reddit.com${raw.permalink}`,
    url: raw.url,
  }
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

function scoreSentence(sentence: string, terms: string[]): number {
  const lower = sentence.toLowerCase()
  let score = 0
  for (const term of terms) {
    if (lower.includes(term)) score += 1
  }
  if (sentence.length > 220) score -= 0.5
  return score
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 40)
}

function pickSubreddits(query: string): string[] {
  const lower = query.toLowerCase()
  if (/\b(rule|stack|layer|trigger|priority|judge|702\.|603\.)\b/.test(lower)) {
    return ['askmagicjudges', 'magicTCG', 'EDH']
  }
  if (/\b(commander|edh|partner|deck|upgrade|mana base|voltron|aristocrat)\b/.test(lower)) {
    return ['EDH', 'magicTCG', 'askmagicjudges']
  }
  return [...MTG_SUBREDDITS]
}

async function searchSubreddit(subreddit: string, query: string, limit: number): Promise<RedditPost[]> {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: 'on',
    sort: 'relevance',
    limit: String(limit),
    t: 'all',
  })

  const data = await fetchRedditJson<RedditListing<RedditPostRaw>>(
    `/r/${subreddit}/search.json?${params}`,
  )

  return (data.data?.children ?? [])
    .map((child) => normalizePost(child.data))
    .filter((post) => post.title.length > 0)
}

async function fetchTopComments(permalink: string, limit: number): Promise<string[]> {
  const path = permalink.replace('https://www.reddit.com', '').replace(/\/$/, '')
  const data = await fetchRedditJson<
    [RedditListing<RedditPostRaw>, RedditListing<RedditCommentRaw>]
  >(`${path}.json?sort=top&limit=${limit}`)

  const comments = data[1]?.data?.children ?? []
  return comments
    .map((child) => child.data?.body?.trim() ?? '')
    .filter((body) => body.length >= 40 && !/^(\[deleted\]|\[removed\])$/i.test(body))
    .slice(0, limit)
}

export async function searchRedditPosts(query: string): Promise<RedditPost[]> {
  const subs = pickSubreddits(query)
  const results = await Promise.all(subs.map((sub) => searchSubreddit(sub, query, 5)))

  const seen = new Set<string>()
  const merged: RedditPost[] = []

  for (const posts of results) {
    for (const post of posts) {
      if (seen.has(post.id)) continue
      seen.add(post.id)
      merged.push(post)
    }
  }

  return merged.sort((a, b) => b.score - a.score).slice(0, 8)
}

export function summarizeRedditPosts(query: string, posts: RedditPost[], commentSnippets: string[]): string {
  const terms = queryTerms(query)
  const ranked = new Map<string, { sentence: string; score: number }>()

  const addText = (text: string, boost = 0) => {
    for (const sentence of splitSentences(text)) {
      const score = scoreSentence(sentence, terms) + boost
      if (score <= 0) continue
      const key = sentence.toLowerCase()
      const existing = ranked.get(key)
      if (!existing || score > existing.score) {
        ranked.set(key, { sentence, score })
      }
    }
  }

  for (const post of posts.slice(0, 5)) {
    addText(post.title, 0.5)
    addText(post.selftext, 1)
  }

  for (const comment of commentSnippets) {
    addText(comment, 1.25)
  }

  const bullets = [...ranked.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.sentence)

  const lines = [
    '**From Reddit** — summarized from community posts (not official Oracle or judge rulings).',
    '',
  ]

  if (bullets.length > 0) {
    lines.push('**What players often say**')
    for (const bullet of bullets) {
      lines.push(`- ${bullet}`)
    }
    lines.push('')
  } else {
    lines.push('Found related threads, but nothing clear enough to summarize. Check the sources below.')
    lines.push('')
  }

  lines.push('**Sources**')
  for (const post of posts.slice(0, 5)) {
    lines.push(
      `- [${post.title}](${post.permalink}) — r/${post.subreddit} · ${post.score} pts · ${post.numComments} comments`,
    )
  }

  return lines.join('\n')
}

export async function replyFromReddit(query: string): Promise<string> {
  const trimmed = query.trim()
  if (!trimmed) {
    return 'Ask anything about Magic — rules, decks, cards, or strategy.'
  }

  const posts = await searchRedditPosts(trimmed)
  if (posts.length === 0) {
    return [
      '**No Reddit results found.**',
      '',
      'Try rephrasing with card names, "Commander", or a rules keyword (e.g. "layers", "stack", "commander damage").',
    ].join('\n')
  }

  const commentSnippets: string[] = []
  for (const post of posts.slice(0, 2)) {
    try {
      commentSnippets.push(...(await fetchTopComments(post.permalink, 3)))
    } catch {
      /* optional enrichment */
    }
  }

  return summarizeRedditPosts(trimmed, posts, commentSnippets)
}
