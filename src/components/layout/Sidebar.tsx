import { LayoutDashboard, MessageSquare, Calendar } from 'lucide-react'
import type { Tab } from '../../types'

interface SidebarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} /> },
  { id: 'calendar', label: 'Kalendarz', icon: <Calendar size={20} /> },
]

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 bg-slate-900 border-r border-slate-700 shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">
          OpenClaw
        </span>
        <span className="text-slate-500 text-xs">Mission Control</span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
              active === tab.id
                ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-600">
        v0.1.0
      </div>
    </aside>
  )
}
