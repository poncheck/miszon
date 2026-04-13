import { useEffect, useRef, useState, useCallback } from 'react'
import { Send } from 'lucide-react'
import { useGatewayStore } from '../../store/gatewayStore'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'
import { useGatewaySocket } from '../../hooks/useGatewaySocket'

export function ChatWindow() {
  const messages = useGatewayStore((s) => s.messages)
  const status = useGatewayStore((s) => s.status)
  const { sendMessage } = useGatewaySocket()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = messages.some((m) => m.isStreaming)
  const isConnected = status === 'connected'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || !isConnected) return
    sendMessage(text)
    setInput('')
    textareaRef.current?.focus()
  }, [input, isConnected, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-slate-500 text-lg">Brak wiadomości</p>
            <p className="text-slate-600 text-sm mt-1">
              {isConnected ? 'Napisz wiadomość, aby rozpocząć rozmowę.' : 'Oczekiwanie na połączenie z gateway...'}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4 bg-slate-900">
        {!isConnected && (
          <p className="text-xs text-yellow-500 mb-2 text-center">
            {status === 'connecting' ? 'Łączenie z gateway...' : 'Brak połączenia z OpenClaw gateway'}
          </p>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            placeholder={isConnected ? 'Napisz wiadomość... (Enter aby wysłać)' : 'Połączenie niedostępne'}
            rows={1}
            className="flex-1 bg-slate-800 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none outline-none border border-slate-700 focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: '44px', maxHeight: '160px' }}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !input.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl p-3 transition-colors shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
