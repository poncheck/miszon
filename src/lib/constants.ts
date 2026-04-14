declare global {
  interface Window {
    __CONFIG__?: { wsUrl?: string; wsToken?: string }
  }
}

export const WS_URL = window.__CONFIG__?.wsUrl ?? 'ws://localhost:18789'
export const WS_TOKEN = window.__CONFIG__?.wsToken ?? ''
export const API_BASE = '/api'
