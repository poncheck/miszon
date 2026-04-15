import { useEffect, useRef, useCallback } from 'react'
import { useGatewayStore } from '../store/gatewayStore'
import { getWsUrl } from '../lib/constants'
import type { GatewayMessage, ChatMessage } from '../types'

const DEVICE_TOKEN_KEY = 'openclaw_device_token'
const DEVICE_NAME = 'Mission Control'

function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY)
}

function saveDeviceToken(token: string) {
  localStorage.setItem(DEVICE_TOKEN_KEY, token)
}

function parseGatewayMessage(raw: string): GatewayMessage | null {
  try {
    const msg = JSON.parse(raw)
    // Loguj wszystkie wiadomości żeby poznać protokół
    console.debug('[OpenClaw WS ←]', msg)
    return msg as GatewayMessage
  } catch {
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
    const ws = new WebSocket(getWsUrl())
    socketRef.current = ws

    ws.onopen = () => {
      const deviceToken = getDeviceToken()

      if (deviceToken) {
        // Mamy device token z poprzedniego parowania — uwierzytelnij
        console.debug('[OpenClaw WS →] auth', { token: deviceToken.slice(0, 8) + '...' })
        ws.send(JSON.stringify({ type: 'auth', token: deviceToken }))
      } else {
        // Brak device tokena — zainicjuj parowanie
        console.debug('[OpenClaw WS →] pair request')
        ws.send(JSON.stringify({ type: 'pair', name: DEVICE_NAME }))
      }

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

        // Odpowiedź po auth — połączenie ustanowione
        case 'ready':
        case 'connected':
        case 'session':
          setStatus('connected')
          if (msg.conversation_id) setConversationId(msg.conversation_id)
          break

        // Parowanie zatwierdzone — gateway odesłał device token
        case 'paired':
        case 'pair_ok': {
          const token = (msg as unknown as Record<string, unknown>).token as string | undefined
          if (token) {
            saveDeviceToken(token)
            console.debug('[OpenClaw WS] Device paired, token saved')
            // Uwierzytelnij się nowym tokenem
            ws.send(JSON.stringify({ type: 'auth', token }))
          }
          setStatus('connected')
          break
        }

        // Parowanie oczekuje na zatwierdzenie przez operatora
        case 'pair_pending':
        case 'pending': {
          console.debug('[OpenClaw WS] Pairing pending — run: openclaw devices approve')
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '🔐 Oczekiwanie na zatwierdzenie parowania. Na serwerze uruchom:\n\n`openclaw devices approve`',
            timestamp: Date.now(),
            isStreaming: false,
          })
          setStatus('connecting')
          break
        }

        case 'message': {
          setStatus('connected')
          addMessage({
            id: crypto.randomUUID(),
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
          setStatus('connected')
          const state = useGatewayStore.getState()
          const streaming = [...state.messages].reverse().find((m: ChatMessage) => m.isStreaming)
          if (streaming) {
            appendDelta(streaming.id, msg.delta ?? msg.content ?? '')
          } else {
            addMessage({
              id: crypto.randomUUID(),
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
          const streaming = [...state.messages].reverse().find((m: ChatMessage) => m.isStreaming)
          if (streaming) finalizeMessage(streaming.id)
          break
        }

        case 'error': {
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ ${msg.error ?? msg.content ?? 'Unknown error'}`,
            timestamp: Date.now(),
            isStreaming: false,
          })
          break
        }

        default:
          // Nieznany typ — logujemy żeby poznać protokół
          console.debug('[OpenClaw WS] Unknown message type:', msg.type, msg)
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

      console.debug('[OpenClaw WS →] message', content)
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

  // Funkcja do resetowania parowania (czyści localStorage)
  const resetPairing = useCallback(() => {
    localStorage.removeItem(DEVICE_TOKEN_KEY)
    console.debug('[OpenClaw WS] Device token cleared, reconnecting...')
    socketRef.current?.close()
  }, [socketRef])

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

  return { sendMessage, resetPairing }
}
