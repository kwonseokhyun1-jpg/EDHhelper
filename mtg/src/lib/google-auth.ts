import type { AppUser } from '../types/user'

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export const googleOAuthEnabled = Boolean(googleClientId?.trim())

export async function fetchGoogleProfile(accessToken: string): Promise<AppUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error('Could not load your Google profile. Try again.')
  }

  const data = (await res.json()) as {
    sub?: string
    email?: string
    name?: string
    picture?: string
  }

  if (!data.sub) {
    throw new Error('Google sign-in did not return a user id.')
  }

  return {
    uid: data.sub,
    email: data.email ?? null,
    displayName: data.name ?? null,
    photoURL: data.picture ?? null,
  }
}
