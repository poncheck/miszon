export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export type Tab = 'dashboard' | 'chat' | 'calendar'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  description?: string
  color?: string
  source?: 'user' | 'openclaw'
  created_at: string
}

export interface GatewayMessage {
  type: string
  content?: string
  delta?: string
  done?: boolean
  conversation_id?: string
  timestamp?: number
  error?: string
}
