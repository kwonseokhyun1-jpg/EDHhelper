import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function UsernameSetup() {
  const { setUsername } = useAuth()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await setUsername(value)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save username')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-mtg-border)] bg-[var(--color-mtg-panel)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-mtg-gold)]">
          Choose a username
        </h2>
        <p className="mt-2 text-sm text-[var(--color-mtg-muted)]">
          This is how you&apos;ll appear in Commander Helper.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Your username"
          maxLength={24}
          className="mt-4 w-full rounded-lg border border-[var(--color-mtg-border)] bg-[var(--color-mtg-bg)] px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="mt-4 w-full rounded-lg bg-[var(--color-mtg-gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
