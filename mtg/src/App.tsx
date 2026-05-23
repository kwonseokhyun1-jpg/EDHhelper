import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WelcomeScreen } from './components/WelcomeScreen'
import { UsernameSetup } from './components/UsernameSetup'
import { CardDetailProvider } from './context/CardDetailContext'
import { PopularityProvider } from './context/PopularityContext'
import { Layout, type TabId } from './components/Layout'
import { FindCommander } from './tabs/FindCommander'
import { FindCard } from './tabs/FindCard'
import { DecklistTab } from './tabs/DecklistTab'
import { FinanceTab } from './tabs/FinanceTab'
import { JudgeTab } from './tabs/JudgeTab'

function AppContent() {
  const { user, loading, needsUsername } = useAuth()
  const [tab, setTab] = useState<TabId>('commander')
  const [decklistText, setDecklistText] = useState('')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-mtg-muted)]">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <WelcomeScreen />
  }

  if (needsUsername) {
    return <UsernameSetup />
  }

  return (
    <Layout
      active={tab}
      onTabChange={setTab}
      onLoadDeck={(text) => {
        setDecklistText(text)
        setTab('deck')
      }}
    >
      {tab === 'commander' && <FindCommander />}
      {tab === 'cards' && <FindCard />}
      {tab === 'deck' && <DecklistTab initialText={decklistText} onTextChange={setDecklistText} />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'judge' && <JudgeTab />}
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <PopularityProvider>
        <CardDetailProvider>
          <AppContent />
        </CardDetailProvider>
      </PopularityProvider>
    </AuthProvider>
  )
}

export default App
