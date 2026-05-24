export type AuthUser = {
  id: string
  email: string
}

const TOKEN_KEY = 'mtg_auth_token'

function apiRoot(): string {
  const base = import.meta.env.BASE_URL
  return `${base}${base.endsWith('/') ? '' : '/'}api`
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) return data.error
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${apiRoot()}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...init?.headers },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    if (/failed to fetch/i.test(msg)) {
      throw new Error(
        'Could not reach the API server. Run `npm run dev` to start the app and database.',
      )
    }
    throw new Error(msg)
  }

  if (!res.ok) {
    throw new Error(await parseError(res))
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function checkApiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${apiRoot()}/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function apiSignUp(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser; token: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setStoredToken(data.token)
  return data.user
}

export async function apiSignIn(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser; token: string }>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setStoredToken(data.token)
  return data.user
}

export async function apiSignOut(): Promise<void> {
  setStoredToken(null)
}

export async function apiGetMe(): Promise<AuthUser | null> {
  if (!getStoredToken()) return null
  try {
    const data = await apiFetch<{ user: AuthUser }>('/auth/me')
    return data.user
  } catch {
    setStoredToken(null)
    return null
  }
}
