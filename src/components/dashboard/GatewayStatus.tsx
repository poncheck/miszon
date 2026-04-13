import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react'
import { useGatewayStore } from '../../store/gatewayStore'
import type { ConnectionStatus } from '../../types'

const icons: Record<ConnectionStatus, React.ReactNode> = {
  connected: <Wifi size={24} className="text-emerald-400" />,
  connecting: <Loader2 size={24} className="text-yellow-400 animate-spin" />,
  disconnected: <WifiOff size={24} className="text-slate-500" />,
  error: <AlertTriangle size={24} className="text-red-400" />,
}

const descriptions: Record<ConnectionStatus, string> = {
  connected: 'Gateway OpenClaw jest aktywny i odpowiada.',
  connecting: 'Próba połączenia z gateway...',
  disconnected: 'Brak połączenia. Ponowne łączenie nastąpi automatycznie.',
  error: 'Błąd WebSocket. Sprawdź czy OpenClaw jest uruchomiony.',
}

export function GatewayStatus() {
  const status = useGatewayStore((s) => s.status)
  const messages = useGatewayStore((s) => s.messages)

  return (
    <div className="bg-slate-800 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {icons[status]}
        <div>
          <p className="text-slate-200 font-medium">OpenClaw Gateway</p>
          <p className="text-slate-400 text-sm">ws://localhost:18789</p>
        </div>
      </div>
      <p className="text-slate-400 text-sm">{descriptions[status]}</p>
      <div className="border-t border-slate-700 pt-3 flex gap-6 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">Wiadomości</p>
          <p className="text-slate-200 font-mono">{messages.length}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">Status</p>
          <p className="text-slate-200 capitalize">{status}</p>
        </div>
      </div>
    </div>
  )
}
