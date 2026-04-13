const colorMap: Record<string, string> = {
  cyan: 'bg-cyan-400',
  blue: 'bg-blue-400',
  green: 'bg-emerald-400',
  red: 'bg-red-400',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
}

interface EventDotProps {
  color?: string
}

export function EventDot({ color = 'cyan' }: EventDotProps) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full inline-block ${colorMap[color] ?? 'bg-cyan-400'}`} />
  )
}
