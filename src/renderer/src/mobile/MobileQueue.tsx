import { AnimatePresence, motion } from 'framer-motion'
import { ListMusic, Play, Trash2, X } from 'lucide-react'
import { songArtists, songCover } from '../lib/api'
import { cn } from '../lib/cn'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { Equalizer } from '../components/Equalizer'

export function MobileQueue(): React.JSX.Element {
  const open = useUiStore((state) => state.queueOpen)
  const setOpen = useUiStore((state) => state.setQueueOpen)
  const queue = usePlayerStore((state) => state.queue)
  const index = usePlayerStore((state) => state.index)
  const playing = usePlayerStore((state) => state.playing)
  const currentId = usePlayerStore((state) => state.current?.id)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue)
  const clearQueue = usePlayerStore((state) => state.clearQueue)

  return (
    <AnimatePresence>
      {open && [
        <motion.div
          key="mobile-queue-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setOpen(false)}
          className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        />,
        <motion.aside
          key="mobile-queue"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 800) setOpen(false)
          }}
          className="glass-strong absolute inset-x-0 bottom-0 z-50 flex max-h-[74vh] flex-col overflow-hidden rounded-t-[28px] border-t border-white/60 shadow-[0_-24px_70px_-30px_rgba(0,0,0,0.35)]"
        >
          <div className="flex justify-center pb-1 pt-2.5">
            <span className="h-1 w-9 rounded-full bg-black/15" />
          </div>
          <header className="flex items-center gap-2 px-5 pb-2.5">
            <ListMusic size={16} className="text-brand" />
            <span className="text-[14px] font-medium text-black/85">播放队列</span>
            <span className="rounded-full bg-white/35 px-2 py-0.5 text-[10px] text-black/45">{queue.length}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={clearQueue}
                className="flex h-8 w-8 items-center justify-center rounded-full text-black/35 transition-transform active:scale-90"
                aria-label="清空队列"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-black/35 transition-transform active:scale-90"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="mobile-bottom min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {queue.map((song, position) => {
              const active = song.id === currentId
              return (
                <div
                  key={`${song.id}-${position}`}
                  onClick={() => {
                    playQueue(queue, position)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-[14px] px-2.5 py-2 transition-colors duration-200',
                    active ? 'glass-pill' : 'active:bg-white/25'
                  )}
                >
                  <div className="relative shrink-0">
                    <Cover src={songCover(song, 96)} radius={8} className="h-10 w-10" />
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-white/45 backdrop-blur-sm">
                        {playing ? <Equalizer active className="scale-75" /> : <Play size={12} fill="currentColor" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate text-[13px]', active ? 'text-brand' : 'text-black/80')}>
                      {song.name}
                    </div>
                    <div className="truncate text-[10.5px] text-black/40">{songArtists(song)}</div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      removeFromQueue(position)
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/25 transition-transform active:scale-90"
                    aria-label="从队列移除"
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}

            {!queue.length && (
              <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-black/25">
                <ListMusic size={30} strokeWidth={1.3} />
                <p className="text-[12px]">播放队列是空的</p>
              </div>
            )}
          </div>

          <div className="mobile-bottom px-5 pb-3 pt-1 text-center text-[10px] text-black/30">
            {queue.length ? `第 ${index + 1} 首 · 共 ${queue.length} 首` : 'JanMusic'}
          </div>
        </motion.aside>
      ]}
    </AnimatePresence>
  )
}
