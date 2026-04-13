import type { ChatMessage } from '../../types'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-cyan-500 text-white rounded-br-sm'
            : 'bg-slate-700 text-slate-200 rounded-bl-sm'
        }`}
      >
        {message.content}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-current ml-1 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}
