import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase'
import {
  loadLocalDecklists,
  loadLocalUser,
  loadLocalUsername,
  persistLocalDecklists,
  saveLocalUser,
  saveLocalUsername,
} from '../lib/local-auth'
import type { SavedDecklist } from '../types/decklist-save'
import type { AppUser } from '../types/user'

type AuthContextValue = {
  user: AppUser | null
  username: string | null
  loading: boolean
  needsUsername: boolean
  signInWithGoogle: () => Promise<void>
  completeGoogleSignIn: (user: AppUser) => void
  signOut: () => Promise<void>
  setUsername: (username: string) => Promise<void>
  savedDecklists: SavedDecklist[]
  decksLoading: boolean
  saveDecklist: (name: string, text: string, commanderName?: string) => Promise<void>
  updateDecklist: (id: string, name: string, text: string, commanderName?: string) => Promise<void>
  deleteDecklist: (id: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapDeck(id: string, data: Record<string, unknown>): SavedDecklist {
  const updated = data.updatedAt as Timestamp | undefined
  return {
    id,
    name: String(data.name ?? 'Untitled deck'),
    text: String(data.text ?? ''),
    commanderName: data.commanderName ? String(data.commanderName) : undefined,
    updatedAt: updated?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  }
}

function toAppUser(fbUser: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}): AppUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [username, setUsernameState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedDecklists, setSavedDecklists] = useState<SavedDecklist[]>([])
  const [decksLoading, setDecksLoading] = useState(false)

  const needsUsername = Boolean(user && !username)

  const loadUsername = useCallback(async (appUser: AppUser) => {
    if (firebaseEnabled && db) {
      const snap = await getDoc(doc(db, 'users', appUser.uid))
      const name = snap.exists() ? String(snap.data().username ?? '') : ''
      setUsernameState(name || null)
      return
    }
    setUsernameState(loadLocalUsername(appUser.uid))
  }, [])

  useEffect(() => {
    if (firebaseEnabled && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const appUser = toAppUser(fbUser)
          setUser(appUser)
          await loadUsername(appUser)
        } else {
          setUser(null)
          setUsernameState(null)
        }
        setLoading(false)
      })
    }

    const local = loadLocalUser()
    setUser(local)
    if (local) setUsernameState(loadLocalUsername(local.uid))
    setLoading(false)
  }, [loadUsername])

  useEffect(() => {
    if (!user) {
      setSavedDecklists([])
      setDecksLoading(false)
      return
    }

    if (firebaseEnabled && db) {
      setDecksLoading(true)
      const q = query(
        collection(db, 'users', user.uid, 'decklists'),
        orderBy('updatedAt', 'desc'),
      )
      return onSnapshot(
        q,
        (snap) => {
          setSavedDecklists(snap.docs.map((d) => mapDeck(d.id, d.data())))
          setDecksLoading(false)
        },
        () => setDecksLoading(false),
      )
    }

    setSavedDecklists(loadLocalDecklists(user.uid))
    setDecksLoading(false)
  }, [user])

  const completeGoogleSignIn = useCallback((appUser: AppUser) => {
    saveLocalUser(appUser)
    setUser(appUser)
    setUsernameState(loadLocalUsername(appUser.uid))
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseEnabled || !auth) {
      throw new Error('Firebase sign-in is not configured.')
    }
    await signInWithPopup(auth, new GoogleAuthProvider())
  }, [])

  const signOut = useCallback(async () => {
    if (firebaseEnabled && auth) {
      await firebaseSignOut(auth)
    } else {
      saveLocalUser(null)
      setUser(null)
      setUsernameState(null)
      setSavedDecklists([])
    }
  }, [])

  const setUsername = useCallback(
    async (name: string) => {
      if (!user) return
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Choose a username.')

      if (firebaseEnabled && db) {
        await setDoc(
          doc(db, 'users', user.uid),
          { username: trimmed, email: user.email ?? null },
          { merge: true },
        )
      } else {
        saveLocalUsername(user.uid, trimmed)
      }
      setUsernameState(trimmed)
    },
    [user],
  )

  const saveDecklist = useCallback(
    async (name: string, text: string, commanderName?: string) => {
      if (!user) throw new Error('Sign in to save decklists.')

      if (firebaseEnabled && db) {
        await addDoc(collection(db, 'users', user.uid, 'decklists'), {
          name: name.trim() || 'Untitled deck',
          text,
          commanderName: commanderName ?? null,
          updatedAt: serverTimestamp(),
        })
        return
      }

      const deck: SavedDecklist = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Untitled deck',
        text,
        commanderName,
        updatedAt: new Date().toISOString(),
      }
      const next = [deck, ...loadLocalDecklists(user.uid)]
      persistLocalDecklists(user.uid, next)
      setSavedDecklists(next)
    },
    [user],
  )

  const updateDecklist = useCallback(
    async (id: string, name: string, text: string, commanderName?: string) => {
      if (!user) throw new Error('Sign in to save decklists.')

      if (firebaseEnabled && db) {
        await updateDoc(doc(db, 'users', user.uid, 'decklists', id), {
          name: name.trim() || 'Untitled deck',
          text,
          commanderName: commanderName ?? null,
          updatedAt: serverTimestamp(),
        })
        return
      }

      const next = loadLocalDecklists(user.uid).map((d) =>
        d.id === id
          ? {
              ...d,
              name: name.trim() || 'Untitled deck',
              text,
              commanderName,
              updatedAt: new Date().toISOString(),
            }
          : d,
      )
      persistLocalDecklists(user.uid, next)
      setSavedDecklists(next)
    },
    [user],
  )

  const deleteDecklist = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Sign in to manage decklists.')

      if (firebaseEnabled && db) {
        await deleteDoc(doc(db, 'users', user.uid, 'decklists', id))
        return
      }

      const next = loadLocalDecklists(user.uid).filter((d) => d.id !== id)
      persistLocalDecklists(user.uid, next)
      setSavedDecklists(next)
    },
    [user],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        loading,
        needsUsername,
        signInWithGoogle,
        completeGoogleSignIn,
        signOut,
        setUsername,
        savedDecklists,
        decksLoading,
        saveDecklist,
        updateDecklist,
        deleteDecklist,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
