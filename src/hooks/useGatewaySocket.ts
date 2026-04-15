import { useEffect, useRef, useCallback } from 'react'
import { useGatewayStore } from '../store/gatewayStore'
import { getWsUrl } from '../lib/constants'
import {
  getIdentity,
  signNonce,
  buildConnectFrame,
  saveDeviceToken,
  randomUUID,
} from '../lib/deviceIdentity'
import type { GatewayMessage, ChatMessage } from '../types'

function parseGatewayMessage(raw: string): GatewayMessage | null {
  try {
    const msg = JSON.parse(raw)
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
      reconnectDelay.current = 1000
      // Wait for connect.challenge from gateway — do NOT send anything yet
      console.debug('[OpenClaw WS] Connected, waiting for challenge...')

      heartbeatInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'req', id: randomUUID(), method: 'ping', params: { timestamp: Date.now() } }))
        }
      }, 30000)
    }

    ws.onmessage = (event: MessageEvent) => {
      const msg = parseGatewayMessage(event.data as string)
      if (!msg) return

      switch (msg.type) {
        // Gateway sends challenge first — respond with signed connect frame
        case 'event': {
          const evt = msg as unknown as Record<string, unknown>
          if (evt.event === 'connect.challenge') {
            const payload = evt.payload as { nonce: string; ts?: number }
            const signedAt = payload.ts ?? Date.now()
            console.debug('[OpenClaw WS] Got challenge, nonce:', payload.nonce)
            getIdentity()
              .then((identity) =>
                signNonce(payload.nonce, signedAt).then(({ signature }) => {
                  const frame = buildConnectFrame(identity, payload.nonce, signedAt, signature)
                  console.debug('[OpenClaw WS →] connect', frame)
                  ws.send(JSON.stringify(frame))
                })
              )
              .catch((err) => console.error('[OpenClaw WS] Failed to respond to challenge:', err))
          }
          break
        }

        // JSON-RPC response to connect frame
        case 'res': {
          const res = msg as unknown as Record<string, unknown>
          const result = res.result as Record<string, unknown> | undefined
          const error = res.error as Record<string, unknown> | undefined

          if (error) {
            const code = error.code as number | undefined
            const message = error.message as string | undefined
            console.debug('[OpenClaw WS] connect error:', error)

            // code 4031 = device pending approval
            if (code === 4031 || message?.toLowerCase().includes('pending')) {
              addMessage({
                id: randomUUID(),
                role: 'assistant',
                content: '🔐 Oczekiwanie na zatwierdzenie parowania. Na serwerze uruchom:\n\n`openclaw devices approve`',
                timestamp: Date.now(),
                isStreaming: false,
              })
              setStatus('connecting')
            } else {
              addMessage({
                id: randomUUID(),
                role: 'assistant',
                content: `⚠️ Błąd połączenia: ${message ?? JSON.stringify(error)}`,
                timestamp: Date.now(),
                isStreaming: false,
              })
              setStatus('error')
            }
            break
          }

          if (result) {
            // payload.auth.deviceToken
            const auth = (result as Record<string, unknown>).auth as Record<string, unknown> | undefined
            const deviceToken = (auth?.deviceToken ?? result.deviceToken) as string | undefined
            if (deviceToken) {
              saveDeviceToken(deviceToken)
              console.debug('[OpenClaw WS] Device token saved')
            }
            setStatus('connected')
            console.debug('[OpenClaw WS] Connected!')
          }
          break
        }

        case 'pong':
          break

        // Odpowiedź po auth — połączenie ustanowione
        case 'ready':
        case 'connected':
        case 'session':
          setStatus('connected')
          if (msg.conversation_id) setConversationId(msg.conversation_id)
          break

        // Parowanie oczekuje na zatwierdzenie przez operatora
        case 'pair_pending':
        case 'pending': {
          console.debug('[OpenClaw WS] Pairing pending — run: openclaw devices approve')
          addMessage({
            id: randomUUID(),
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
            id: randomUUID(),
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
              id: randomUUID(),
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
            id: randomUUID(),
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
      const id = randomUUID()

      addMessage({ id, role: 'user', content, timestamp: Date.now() })

      console.debug('[OpenClaw WS →] message', content)
      ws.send(
        JSON.stringify({
          type: 'req',
          id,
          method: 'message',
          params: {
            content,
            conversationId: state.conversationId ?? undefined,
            timestamp: Date.now(),
          },
        })
      )
      return true
    },
    [socketRef, addMessage]
  )

  // Funkcja do resetowania parowania
  const resetPairing = useCallback(() => {
    console.debug('[OpenClaw WS] Reconnecting with fresh nonce...')
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
