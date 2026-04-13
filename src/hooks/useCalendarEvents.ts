import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { getEvents, createEvent, deleteEvent } from '../lib/api'
import type { CalendarEvent } from '../types'

export function useCalendarEvents(currentMonth: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthKey = format(currentMonth, 'yyyy-MM')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEvents(monthKey)
      setEvents(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const addEvent = useCallback(
    async (data: Omit<CalendarEvent, 'id' | 'created_at'>) => {
      const created = await createEvent(data)
      setEvents((prev) => [...prev, created])
      return created
    },
    []
  )

  const removeEvent = useCallback(async (id: string) => {
    await deleteEvent(id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { events, loading, error, addEvent, removeEvent, refresh: fetchEvents }
}
