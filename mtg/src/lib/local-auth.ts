import type { SavedDecklist } from '../types/decklist-save'
import type { AppUser } from '../types/user'

const USER_KEY = 'commander-helper-user'
const USERNAME_KEY = 'commander-helper-username'
const DECKS_KEY = 'commander-helper-decks'

export function loadLocalUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

export function saveLocalUser(user: AppUser | null): void {
  if (!user) {
    localStorage.removeItem(USER_KEY)
    return
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function loadLocalUsername(uid: string): string | null {
  try {
    const map = JSON.parse(localStorage.getItem(USERNAME_KEY) ?? '{}') as Record<string, string>
    return map[uid] ?? null
  } catch {
    return null
  }
}

export function saveLocalUsername(uid: string, username: string): void {
  const map = JSON.parse(localStorage.getItem(USERNAME_KEY) ?? '{}') as Record<string, string>
  map[uid] = username
  localStorage.setItem(USERNAME_KEY, JSON.stringify(map))
}

function deckStore(): Record<string, SavedDecklist[]> {
  try {
    return JSON.parse(localStorage.getItem(DECKS_KEY) ?? '{}') as Record<string, SavedDecklist[]>
  } catch {
    return {}
  }
}

export function loadLocalDecklists(uid: string): SavedDecklist[] {
  return deckStore()[uid] ?? []
}

export function persistLocalDecklists(uid: string, decks: SavedDecklist[]): void {
  const store = deckStore()
  store[uid] = decks
  localStorage.setItem(DECKS_KEY, JSON.stringify(store))
}
