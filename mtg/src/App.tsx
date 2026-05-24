import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { CardDetailProvider } from './context/CardDetailContext'
import { PopularityProvider } from './context/PopularityContext'
import { Layout, type TabId } from './components/Layout'
import { FindCommander } from './tabs/FindCommander'
import { FindCard } from './tabs/FindCard'
import { DecksTab } from './tabs/DecksTab'
import { FinanceTab } from './tabs/FinanceTab'
import { JudgeTab } from './tabs/JudgeTab'

function App() {
  const [tab, setTab] = useState<TabId>('commander')

  return (
    <AuthProvider>
      <PopularityProvider>
        <CardDetailProvider>
          <Layout active={tab} onTabChange={setTab}>
            {tab === 'commander' && <FindCommander />}
            {tab === 'cards' && <FindCard />}
            {tab === 'deck' && <DecksTab />}
            {tab === 'finance' && <FinanceTab />}
            {tab === 'judge' && <JudgeTab />}
          </Layout>
        </CardDetailProvider>
      </PopularityProvider>
    </AuthProvider>
  )
}

export default App
