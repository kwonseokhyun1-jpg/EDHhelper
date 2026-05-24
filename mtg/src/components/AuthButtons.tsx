import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'

type Props = {
  compact?: boolean
}

export function AuthButtons({ compact = false }: Props) {
  const { user, loading, signOut } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'sign-in' | 'sign-up'>('sign-in')

  const btnClass = compact
    ? 'rounded border border-[var(--color-mtg-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-mtg-muted)] transition hover:border-[var(--color-mtg-gold)] hover:text-white'
    : 'rounded-lg border border-[var(--color-mtg-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-mtg-muted)] transition hover:border-[var(--color-mtg-gold)] hover:text-white'

  const openModal = (mode: 'sign-in' | 'sign-up') => {
    setModalMode(mode)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-[var(--color-mtg-muted)]`}>
        …
      </span>
    )
  }

  if (user) {
    const label = user.email?.split('@')[0] ?? 'Account'
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`max-w-[5rem] truncate ${compact ? 'text-[10px]' : 'text-xs'} text-[var(--color-mtg-muted)]`}
          title={user.email ?? undefined}
        >
          {label}
        </span>
        <button type="button" onClick={() => signOut()} className={btnClass}>
          Out
        </button>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => openModal('sign-in')} className={btnClass}>
        Log in
      </button>
      <button
        type="button"
        onClick={() => openModal('sign-up')}
        className={
          compact
            ? 'rounded bg-[var(--color-mtg-gold)] px-2 py-0.5 text-[10px] font-semibold text-black'
            : 'rounded-lg bg-[var(--color-mtg-gold)] px-2.5 py-1.5 text-xs font-semibold text-black'
        }
      >
        Sign up
      </button>
      <AuthModal
        key={modalOpen ? modalMode : 'closed'}
        open={modalOpen}
        initialMode={modalMode}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
