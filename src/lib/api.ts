import { API_BASE } from './constants'
import type { CalendarEvent } from '../types'

export async function getEvents(month: string): Promise<CalendarEvent[]> {
  const res = await fetch(`${API_BASE}/events?month=${month}`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

export async function createEvent(
  data: Omit<CalendarEvent, 'id' | 'created_at'>
): Promise<CalendarEvent> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create event')
  return res.json()
}

export async function updateEvent(
  id: string,
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update event')
  return res.json()
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete event')
}
