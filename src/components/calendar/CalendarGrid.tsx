import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarEvents } from '../../hooks/useCalendarEvents'
import { EventDot } from './EventDot'
import { EventModal } from './EventModal'
import type { CalendarEvent } from '../../types'

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

export function CalendarGrid() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const { events, addEvent, removeEvent } = useCalendarEvents(currentMonth)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsForDay = (day: Date): CalendarEvent[] =>
    events.filter((e) => e.date === format(day, 'yyyy-MM-dd'))

  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : []

  return (
    <div className="flex flex-col h-full">
      {/* Month header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-200 text-lg font-medium capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 text-sm transition-colors"
          >
            Dziś
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs text-slate-500 uppercase tracking-wide py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map((day) => {
          const dayEvents = eventsForDay(day)
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const selected = selectedDay ? isSameDay(day, selectedDay) : false

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`relative flex flex-col items-center pt-2 pb-1 rounded-lg min-h-[60px] transition-colors ${
                !inMonth ? 'opacity-30' : ''
              } ${
                selected
                  ? 'bg-cyan-500/20 ring-1 ring-cyan-500'
                  : today
                  ? 'bg-slate-700 ring-1 ring-slate-600'
                  : 'hover:bg-slate-700/50'
              }`}
            >
              <span
                className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  today ? 'bg-cyan-500 text-white' : 'text-slate-300'
                }`}
              >
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <EventDot key={ev.id} color={ev.color} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Modal */}
      {selectedDay && (
        <EventModal
          date={selectedDay}
          events={selectedDayEvents}
          onClose={() => setSelectedDay(null)}
          onAdd={async (data) => { await addEvent(data) }}
          onDelete={removeEvent}
        />
      )}
    </div>
  )
}
