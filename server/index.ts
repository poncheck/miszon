import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import eventsRouter from './routes/events.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)
const WS_URL = process.env.WS_URL ?? 'ws://localhost:18789'
const WS_TOKEN = process.env.WS_TOKEN ?? ''
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// Runtime config for frontend — injects WS_URL without baking it into the JS bundle
app.get('/config.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.send(`window.__CONFIG__ = ${JSON.stringify({ wsUrl: WS_URL, wsToken: WS_TOKEN })};`)
})

// API routes
app.use('/api/events', eventsRouter)

// Serve static Vite build in production
if (isProd) {
  const distPath = path.join(__dirname, '..', '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[mission-control] Server running on http://0.0.0.0:${PORT}`)
  console.log(`[mission-control] Gateway: ${WS_URL}`)
  console.log(`[mission-control] Mode: ${isProd ? 'production' : 'development'}`)
})
