import { useEffect, useRef, useCallback } from 'react'
import { useGatewayStore } from '../store/gatewayStore'
import { WS_URL } from '../lib/constants'
import type { GatewayMessage, ChatMessage } from '../types'

function parseGatewayMessage(raw: string): GatewayMessage | null {
  try {
    const msg = JSON.parse(raw)
    // Log in dev to help identify actual OpenClaw wire format
    if (import.meta.env.DEV) {
      console.debug('[OpenClaw WS]', msg)
    }
    return msg as GatewayMessage
  } catch {
    // Plain text response fallback
    return { type: 'message', content: raw }
  }
}

export function useGatewaySocket() {
  const { setStatus, addMessage, appendDelta, finalizeMessage, setConversationId, socketRef } =
    useGatewayStore()
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const unmounted = useRef(false)

  const connect = useCallback(() => {
    if (unmounted.current) return

    setStatus('connecting')
    const ws = new WebSocket(WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      reconnectDelay.current = 1000

      heartbeatInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        }
      }, 30000)
    }

    ws.onmessage = (event: MessageEvent) => {
      const msg = parseGatewayMessage(event.data as string)
      if (!msg) return

      switch (msg.type) {
        case 'pong':
          break

        case 'message': {
          const id = crypto.randomUUID()
          addMessage({
            id,
            role: 'assistant',
            content: msg.content ?? '',
            timestamp: msg.timestamp ?? Date.now(),
            isStreaming: false,
          })
          if (msg.conversation_id) setConversationId(msg.conversation_id)
          break
        }

        case 'stream':
        case 'delta': {
          // Check if we have an active streaming message
          const state = useGatewayStore.getState()
          const allMessages = state.messages
        const streaming = [...allMessages].reverse().find((m: ChatMessage) => m.isStreaming)
          if (streaming) {
            appendDelta(streaming.id, msg.delta ?? msg.content ?? '')
          } else {
            const id = crypto.randomUUID()
            addMessage({
              id,
              role: 'assistant',
              content: msg.delta ?? msg.content ?? '',
              timestamp: Date.now(),
              isStreaming: true,
            })
          }
          if (msg.conversation_id) setConversationId(msg.conversation_id)
          break
        }

        case 'done': {
          const state = useGatewayStore.getState()
          const allMessages = state.messages
        const streaming = [...allMessages].reverse().find((m: ChatMessage) => m.isStreaming)
          if (streaming) finalizeMessage(streaming.id)
          break
        }

        case 'error': {
          const id = crypto.randomUUID()
          addMessage({
            id,
            role: 'assistant',
            content: `⚠️ ${msg.error ?? msg.content ?? 'Unknown error'}`,
            timestamp: Date.now(),
            isStreaming: false,
          })
          break
        }
      }
    }

    ws.onclose = () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current)
      socketRef.current = null
      if (!unmounted.current) {
        setStatus('disconnected')
        reconnectTimeout.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
          connect()
        }, reconnectDelay.current)
      }
    }

    ws.onerror = () => {
      setStatus('error')
      ws.close()
    }
  }, [setStatus, addMessage, appendDelta, finalizeMessage, setConversationId, socketRef])

  const sendMessage = useCallback(
    (content: string) => {
      const ws = socketRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return false

      const state = useGatewayStore.getState()
      const id = crypto.randomUUID()

      addMessage({ id, role: 'user', content, timestamp: Date.now() })

      ws.send(
        JSON.stringify({
          type: 'message',
          content,
          conversation_id: state.conversationId ?? undefined,
          timestamp: Date.now(),
        })
      )
      return true
    },
    [socketRef, addMessage]
  )

  useEffect(() => {
    unmounted.current = false
    connect()

    return () => {
      unmounted.current = true
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current)
      socketRef.current?.close()
    }
  }, [connect, socketRef])

  return { sendMessage }
}
