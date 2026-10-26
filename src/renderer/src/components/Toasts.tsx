import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../lib/cn'
import { useUiStore } from '../store/ui'

const ICONS = {
  info: Info,
  error: AlertCircle,
  success: CheckCircle2
}

export function Toasts(): React.JSX.Element {
  const toasts = useUiStore((state) => state.toasts)
  const dismiss = useUiStore((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed bottom-[170px] left-1/2 z-[80] flex w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-[116px] sm:w-auto">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind]
          return (
            <motion.button
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              onClick={() => dismiss(toast.id)}
              className={cn(
                'glass-strong pointer-events-auto flex max-w-[520px] items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] shadow-[0_12px_40px_-18px_rgba(0,0,0,0.3)]',
                toast.kind === 'error'
                  ? 'border-brand/25 text-brand'
                  : toast.kind === 'success'
                    ? 'border-emerald-600/20 text-emerald-700'
                    : 'border-white/60 text-black/75'
              )}
            >
              <Icon size={14} />
              <span className="truncate">{toast.message}</span>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
