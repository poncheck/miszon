import { Router } from 'express'
import * as store from '../eventsStore.js'

const router = Router()

// GET /api/events?month=2026-04
router.get('/', (req, res) => {
  const month = (req.query.month as string) ?? ''
  if (!month.match(/^\d{4}-\d{2}$/)) {
    return res.status(400).json({ error: 'month param required, format: YYYY-MM' })
  }
  res.json(store.listEvents(month))
})

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const event = store.getEvent(req.params.id)
  if (!event) return res.status(404).json({ error: 'Not found' })
  res.json(event)
})

// POST /api/events
router.post('/', (req, res) => {
  const { title, date, start_time, end_time, description, color, source } = req.body as store.Event

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' })
  }
  if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  }

  const event = store.createEvent({ title, date, start_time, end_time, description, color, source })
  res.status(201).json(event)
})

// PATCH /api/events/:id
router.patch('/:id', (req, res) => {
  const updated = store.updateEvent(req.params.id, req.body as Partial<store.Event>)
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  const ok = store.deleteEvent(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

export default router
