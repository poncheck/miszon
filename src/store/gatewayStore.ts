import { create } from 'zustand'
import type { ChatMessage, ConnectionStatus } from '../types'

interface GatewayStore {
  status: ConnectionStatus
  messages: ChatMessage[]
  conversationId: string | null
  socketRef: { current: WebSocket | null }
  setStatus: (status: ConnectionStatus) => void
  addMessage: (msg: ChatMessage) => void
  appendDelta: (id: string, delta: string) => void
  finalizeMessage: (id: string) => void
  setConversationId: (id: string) => void
  clearMessages: () => void
}

export const useGatewayStore = create<GatewayStore>((set) => ({
  status: 'disconnected',
  messages: [],
  conversationId: null,
  socketRef: { current: null },

  setStatus: (status) => set({ status }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  appendDelta: (id, delta) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m
      ),
    })),

  finalizeMessage: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
    })),

  setConversationId: (id) => set({ conversationId: id }),

  clearMessages: () => set({ messages: [] }),
}))
