import { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { X, Trash2, Bot, User } from 'lucide-react'
import type { CalendarEvent } from '../../types'

interface EventModalProps {
  date: Date
  events: CalendarEvent[]
  onClose: () => void
  onAdd: (data: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function EventModal({ date, events, onClose, onAdd, onDelete }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onAdd({
        title: title.trim(),
        date: format(date, 'yyyy-MM-dd'),
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        description: description.trim() || undefined,
        color: 'cyan',
        source: 'user',
      })
      setTitle('')
      setStartTime('')
      setEndTime('')
      setDescription('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-slate-200 font-medium capitalize">
            {format(date, 'EEEE, d MMMM yyyy', { locale: pl })}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Existing events */}
          {events.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Eventy</p>
              {events.map((ev) => (
                <div key={ev.id} className="bg-slate-700 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ev.source === 'openclaw'
                        ? <Bot size={14} className="text-cyan-400 shrink-0" />
                        : <User size={14} className="text-slate-400 shrink-0" />
                      }
                      <p className="text-slate-200 text-sm font-medium truncate">{ev.title}</p>
                    </div>
                    {(ev.start_time || ev.end_time) && (
                      <p className="text-slate-400 text-xs mt-1 ml-5">
                        {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-slate-400 text-xs mt-1 ml-5 line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(ev.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new event */}
          <div className="flex flex-col gap-3">
            <p className="text-slate-500 text-xs uppercase tracking-wide">Dodaj event</p>
            <input
              type="text"
              placeholder="Tytuł *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-700 text-slate-200 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-600 focus:border-cyan-500 transition-colors"
            />
            <div className="flex gap-3">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 bg-slate-700 text-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-600 focus:border-cyan-500 transition-colors"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 bg-slate-700 text-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-600 focus:border-cyan-500 transition-colors"
              />
            </div>
            <textarea
              placeholder="Opis (opcjonalnie)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-slate-700 text-slate-200 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-600 focus:border-cyan-500 resize-none transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!title.trim() || saving}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {saving ? 'Zapisywanie...' : 'Dodaj'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
