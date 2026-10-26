import { useRef, useState } from 'react'
import { cn } from '../lib/cn'

interface SliderProps {
  value: number
  max: number
  onChange: (value: number) => void
  onCommit?: (value: number) => void
  className?: string
  trackHeight?: number
  accent?: string
  preview?: (ratio: number) => string
  disabled?: boolean
}

export function Slider({
  value,
  max,
  onChange,
  onCommit,
  className,
  trackHeight = 3,
  accent = 'linear-gradient(90deg, #ff1949, #ff6b8a)',
  preview,
  disabled
}: SliderProps): React.JSX.Element {
  const railRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [hoverRatio, setHoverRatio] = useState(0)

  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const active = (dragging || hovering) && !disabled
  const height = active ? trackHeight + 2 : trackHeight

  const ratioAt = (clientX: number): number => {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  return (
    <div className={cn('group/slider relative flex h-4 select-none items-center', className)}>
      <div
        ref={railRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={-1}
        className={cn('relative w-full', disabled ? 'cursor-default' : 'cursor-pointer')}
        style={{ height, transition: 'height 0.15s ease' }}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => {
          if (!dragging) setHovering(false)
        }}
        onPointerDown={(event) => {
          if (disabled) return
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          setHovering(true)
          const next = ratioAt(event.clientX)
          setHoverRatio(next)
          onChange(next * max)
        }}
        onPointerMove={(event) => {
          if (disabled) return
          const next = ratioAt(event.clientX)
          setHoverRatio(next)
          if (dragging) onChange(next * max)
        }}
        onPointerUp={(event) => {
          if (disabled) return
          const next = ratioAt(event.clientX)
          setDragging(false)
          onChange(next * max)
          onCommit?.(next * max)
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="absolute inset-x-0 top-1/2 h-full -translate-y-1/2 rounded-full bg-black/[0.1]" />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${ratio * 100}%`,
            background: accent,
            transition: dragging ? 'none' : 'width 0.25s linear'
          }}
        />
        <div
          className="absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.05),0_0_0_4px_rgba(255,25,73,0.1)]"
          style={{
            left: `${ratio * 100}%`,
            opacity: active ? 1 : 0,
            transition: dragging ? 'opacity 0.2s' : 'left 0.25s linear, opacity 0.2s'
          }}
        />
      </div>
      {preview && hovering && !disabled && (
        <div
          className="glass-strong pointer-events-none absolute bottom-6 z-10 -translate-x-1/2 rounded-[8px] border border-white/60 px-2 py-1 text-[10px] text-black/70 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.3)]"
          style={{ left: `${hoverRatio * 100}%` }}
        >
          {preview(hoverRatio)}
        </div>
      )}
    </div>
  )
}
