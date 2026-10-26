import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { Quality } from '../../../shared/types'
import { cn } from '../lib/cn'
import { usePlayerStore } from '../store/player'

const QUALITIES: { value: Quality; label: string }[] = [
  { value: 'standard', label: '标准' },
  { value: 'higher', label: '较高' },
  { value: 'exhigh', label: '极高' },
  { value: 'lossless', label: '无损' },
  { value: 'hires', label: 'Hi-Res' }
]

interface QualityMenuProps {
  align?: 'left' | 'right'
  className?: string
}

export function QualityMenu({ align = 'right', className }: QualityMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const quality = usePlayerStore((state) => state.quality)
  const setQuality = usePlayerStore((state) => state.setQuality)
  const label = QUALITIES.find((item) => item.value === quality)?.label ?? '极高'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'rounded-full border border-white/50 bg-white/20 px-2 py-[2px] text-[10px] leading-[15px] text-black/55 backdrop-blur-md transition-all duration-200 hover:border-white/80 hover:bg-white/30 hover:text-black active:scale-95',
          className
        )}
      >
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'glass-strong absolute bottom-full z-50 mb-2 w-[128px] rounded-[16px] border border-white/50 p-1 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]',
                align === 'right' ? 'right-0' : 'left-0'
              )}
            >
              {QUALITIES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setQuality(item.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[9px] px-2.5 py-1.5 text-[11.5px] transition-colors duration-150',
                    quality === item.value ? 'bg-white/30 text-black' : 'text-black/55 hover:bg-white/20 hover:text-black'
                  )}
                >
                  {item.label}
                  {quality === item.value && <Check size={11} className="text-brand" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
