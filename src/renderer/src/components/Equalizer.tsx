import { cn } from '../lib/cn'

interface EqualizerProps {
  active: boolean
  className?: string
  color?: string
}

const HEIGHTS = [11, 17, 8, 14]

export function Equalizer({ active, className, color = '#ff1949' }: EqualizerProps): React.JSX.Element {
  return (
    <div className={cn('flex h-[18px] items-end gap-[2.5px]', className)}>
      {HEIGHTS.map((height, index) => (
        <span
          key={index}
          className={cn('w-[3px] rounded-full', active && 'eq-bar')}
          style={{
            height,
            background: color,
            opacity: active ? 1 : 0.35,
            animationDelay: `${index * 0.13}s`,
            animationDuration: `${0.72 + index * 0.11}s`
          }}
        />
      ))}
    </div>
  )
}
