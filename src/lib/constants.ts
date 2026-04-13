declare global {
  interface Window {
    __CONFIG__?: { wsUrl?: string }
  }
}

export const WS_URL =
  window.__CONFIG__?.wsUrl ?? 'ws://localhost:18789'

export const API_BASE = '/api'
