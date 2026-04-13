import { useGatewayStore } from '../../store/gatewayStore'
import type { ConnectionStatus } from '../../types'

const statusConfig: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  connected: { label: 'Połączono', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  connecting: { label: 'Łączenie...', color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  disconnected: { label: 'Rozłączono', color: 'text-slate-500', dot: 'bg-slate-500' },
  error: { label: 'Błąd połączenia', color: 'text-red-400', dot: 'bg-red-400' },
}

export function StatusBar() {
  const status = useGatewayStore((s) => s.status)
  const cfg = statusConfig[status]

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
      <h1 className="text-slate-300 text-sm font-medium">Mission Control</h1>
      <div className={`flex items-center gap-2 text-xs font-medium ${cfg.color}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        Gateway: {cfg.label}
      </div>
    </header>
  )
}
