import { createContext, useContext, useState, type ReactNode } from 'react'

type PopularityContextValue = {
  showPopularity: boolean
  setShowPopularity: (value: boolean) => void
}

const PopularityContext = createContext<PopularityContextValue | null>(null)

export function PopularityProvider({ children }: { children: ReactNode }) {
  const [showPopularity, setShowPopularity] = useState(true)

  return (
    <PopularityContext.Provider value={{ showPopularity, setShowPopularity }}>
      {children}
    </PopularityContext.Provider>
  )
}

export function usePopularity(): PopularityContextValue {
  const ctx = useContext(PopularityContext)
  if (!ctx) throw new Error('usePopularity must be used within PopularityProvider')
  return ctx
}
