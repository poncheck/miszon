import { useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { DashboardPage } from './pages/DashboardPage'
import { ChatPage } from './pages/ChatPage'
import { CalendarPage } from './pages/CalendarPage'
import type { Tab } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar active={activeTab} onChange={setActiveTab} />
      <div className="flex flex-col flex-1 min-w-0">
        <StatusBar />
        <main className="flex-1 overflow-auto">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'chat' && <ChatPage />}
          {activeTab === 'calendar' && <CalendarPage />}
        </main>
      </div>
    </div>
  )
}
