import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

type Props = {
  open: boolean
  initialMode?: 'sign-in' | 'sign-up'
  onClose: () => void
}

export function AuthModal({ open, initialMode = 'sign-in', onClose }: Props) {
  const { apiAvailable, signIn, signUp } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      if (!apiAvailable) {
        throw new Error(
          'API server is not running. Start the app with `npm run dev` (runs the database server and frontend).',
        )
      }
      if (mode === 'sign-in') {
        await signIn(email.trim(), password)
        onClose()
      } else {
        await signUp(email.trim(), password)
        setMessage('Account created. You are signed in.')
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-mtg-gold)]">
              {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-mtg-muted)]">
              Save and sync your decklists across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--color-mtg-muted)] hover:text-white"
          >
            Close
          </button>
        </div>

        {!apiAvailable && (
          <p className="mb-4 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            Start the app with <code className="text-amber-100">npm run dev</code> to enable sign
            up and cloud deck storage (Prisma + SQLite).
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-[var(--color-mtg-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-mtg-muted)]">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-emerald-400">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[var(--color-mtg-gold)] py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--color-mtg-muted)]">
          {mode === 'sign-in' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('sign-up')
                  setError(null)
                  setMessage(null)
                }}
                className="text-[var(--color-mtg-gold)] hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('sign-in')
                  setError(null)
                  setMessage(null)
                }}
                className="text-[var(--color-mtg-gold)] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
