import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { nanoid } from 'nanoid'

const EVENTS_DIR = process.env.EVENTS_DIR ?? path.join(process.cwd(), 'data', 'events')

function ensureDir() {
  if (!fs.existsSync(EVENTS_DIR)) {
    fs.mkdirSync(EVENTS_DIR, { recursive: true })
  }
}

export interface Event {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  description?: string
  color?: string
  source?: string
  created_at: string
}

function filePathForId(id: string, date: string): string {
  return path.join(EVENTS_DIR, `${date}-${id}.md`)
}

function findFileById(id: string): string | null {
  ensureDir()
  const files = fs.readdirSync(EVENTS_DIR)
  const match = files.find((f) => f.endsWith(`-${id}.md`))
  return match ? path.join(EVENTS_DIR, match) : null
}

export function listEvents(month: string): Event[] {
  ensureDir()
  const files = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith('.md'))
  const events: Event[] = []

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(EVENTS_DIR, file), 'utf-8')
      const { data, content } = matter(raw)
      if (!data.date || !String(data.date).startsWith(month)) continue
      events.push({
        id: data.id,
        title: data.title,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        description: content.trim() || data.description,
        color: data.color ?? 'cyan',
        source: data.source ?? 'user',
        created_at: data.created_at,
      })
    } catch {
      // skip malformed files
    }
  }

  return events.sort((a, b) => {
    const d = a.date.localeCompare(b.date)
    if (d !== 0) return d
    return (a.start_time ?? '').localeCompare(b.start_time ?? '')
  })
}

export function getEvent(id: string): Event | null {
  const filePath = findFileById(id)
  if (!filePath) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    id: data.id,
    title: data.title,
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    description: content.trim() || data.description,
    color: data.color ?? 'cyan',
    source: data.source ?? 'user',
    created_at: data.created_at,
  }
}

export function createEvent(data: Omit<Event, 'id' | 'created_at'>): Event {
  ensureDir()
  const id: string = nanoid(10)
  const created_at = new Date().toISOString()
  const event: Event = { ...data, id, created_at }

  const { description, ...frontmatterData } = event
  const fileContent = matter.stringify(description ?? '', frontmatterData)
  fs.writeFileSync(filePathForId(id, data.date), fileContent, 'utf-8')

  return event
}

export function updateEvent(id: string, updates: Partial<Event>): Event | null {
  const filePath = findFileById(id)
  if (!filePath) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const updated = { ...data, ...updates, id }
  const { description, ...frontmatterData } = updated
  const newContent = matter.stringify(
    description ?? content.trim() ?? '',
    frontmatterData
  )

  // If date changed, rename file
  const newFilePath = filePathForId(id, updated.date ?? data.date)
  if (filePath !== newFilePath) {
    fs.unlinkSync(filePath)
  }
  fs.writeFileSync(newFilePath, newContent, 'utf-8')

  return getEvent(id)
}

export function deleteEvent(id: string): boolean {
  const filePath = findFileById(id)
  if (!filePath) return false
  fs.unlinkSync(filePath)
  return true
}
