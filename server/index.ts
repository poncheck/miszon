import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import eventsRouter from './routes/events.js'
import { getPublicInfo, signNonce, saveDeviceToken, getOrCreateIdentity } from './identity.js'

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

// Initialize identity on startup
getOrCreateIdentity()

// Device identity — GET public info, POST sign nonce, POST save token
app.get('/api/identity', (_req, res) => {
  res.json(getPublicInfo())
})

app.post('/api/identity/sign', (req, res) => {
  const { nonce } = req.body as { nonce?: string }
  if (!nonce) { res.status(400).json({ error: 'nonce required' }); return }
  const signedAt = Date.now()
  const signature = signNonce(nonce)
  res.json({ signature, signedAt })
})

app.post('/api/identity/token', (req, res) => {
  const { token } = req.body as { token?: string }
  if (!token) { res.status(400).json({ error: 'token required' }); return }
  saveDeviceToken(token)
  res.json({ ok: true })
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
