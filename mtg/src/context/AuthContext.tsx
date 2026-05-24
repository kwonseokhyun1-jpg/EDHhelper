import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiGetMe,
  apiSignIn,
  apiSignOut,
  apiSignUp,
  checkApiAvailable,
  type AuthUser,
} from '../lib/api-client'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  apiAvailable: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiAvailable, setApiAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const available = await checkApiAvailable()
      if (cancelled) return
      setApiAvailable(available)

      if (!available) {
        setUser(null)
        setLoading(false)
        return
      }

      const me = await apiGetMe()
      if (cancelled) return
      setUser(me)
      setLoading(false)
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const nextUser = await apiSignIn(email, password)
    setUser(nextUser)
    setApiAvailable(true)
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const nextUser = await apiSignUp(email, password)
    setUser(nextUser)
    setApiAvailable(true)
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      apiAvailable,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, apiAvailable, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export type { AuthUser }
