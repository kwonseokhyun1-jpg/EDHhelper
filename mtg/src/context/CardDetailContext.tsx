import { createContext, useContext, useState, type ReactNode } from 'react'
import { CardDetailModal } from '../components/CardDetailModal'
import type { DetailItem } from '../lib/card-insight'

type CardDetailContextValue = {
  openDetail: (item: DetailItem) => void
  closeDetail: () => void
}

const CardDetailContext = createContext<CardDetailContextValue | null>(null)

export function CardDetailProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<DetailItem | null>(null)

  return (
    <CardDetailContext.Provider
      value={{
        openDetail: setItem,
        closeDetail: () => setItem(null),
      }}
    >
      {children}
      <CardDetailModal item={item} onClose={() => setItem(null)} />
    </CardDetailContext.Provider>
  )
}

export function useCardDetail(): CardDetailContextValue {
  const ctx = useContext(CardDetailContext)
  if (!ctx) throw new Error('useCardDetail must be used within CardDetailProvider')
  return ctx
}
