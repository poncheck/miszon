import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useClock } from '../../hooks/useClock'

export function ClockWidget() {
  const now = useClock()

  const time = format(now, 'HH:mm:ss')
  const date = format(now, 'EEEE, d MMMM yyyy', { locale: pl })

  return (
    <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-2">
      <p className="text-slate-400 text-sm uppercase tracking-widest">Czas lokalny</p>
      <p className="text-6xl font-mono font-bold text-cyan-400 tabular-nums">{time}</p>
      <p className="text-slate-300 text-lg capitalize">{date}</p>
    </div>
  )
}
