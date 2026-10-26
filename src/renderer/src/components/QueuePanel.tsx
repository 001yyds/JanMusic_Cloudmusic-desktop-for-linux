import { AnimatePresence, motion } from 'framer-motion'
import { ListMusic, Play, Trash2, X } from 'lucide-react'
import { songArtists, songCover } from '../lib/api'
import { cn } from '../lib/cn'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'
import { Equalizer } from './Equalizer'

export function QueuePanel(): React.JSX.Element {
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
          key="queue-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setOpen(false)}
          className="absolute inset-0 z-10 bg-black/10"
        />,
        <motion.aside
          key="queue-panel"
          initial={{ x: 40, opacity: 0, scale: 0.98 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className="glass-strong absolute bottom-3 right-3 top-3 z-20 flex w-[312px] flex-col overflow-hidden rounded-[24px] border border-white/50 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.35)]"
        >
          <header className="flex items-center gap-2 px-4 pb-2 pt-4">
            <div className="flex items-center gap-2">
              <ListMusic size={15} className="text-brand" />
              <span className="text-[13px] font-medium text-black/80">播放队列</span>
              <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-[10px] text-black/45">
                {queue.length}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={clearQueue}
                title="清空队列"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-black/30 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-black/30 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {queue.map((song, position) => {
              const active = song.id === currentId
              return (
                <div
                  key={`${song.id}-${position}`}
                  onClick={() => playQueue(queue, position)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2.5 rounded-[12px] px-2 py-1.5 transition-colors duration-200',
                    active ? 'glass-pill' : 'hover:bg-white/20'
                  )}
                >
                  <div className="relative">
                    <Cover src={songCover(song, 80)} radius={7} className="h-9 w-9" />
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[7px] bg-white/40 backdrop-blur-sm">
                        {playing ? <Equalizer active className="scale-75" /> : <Play size={12} fill="currentColor" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate text-[12px]', active ? 'text-brand' : 'text-black/80')}>
                      {song.name}
                    </div>
                    <div className="truncate text-[10.5px] text-black/40">{songArtists(song)}</div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      removeFromQueue(position)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-black/25 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:text-black active:scale-90"
                    title="从队列移除"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}

            {!queue.length && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-black/25">
                <ListMusic size={28} strokeWidth={1.4} />
                <p className="text-[11.5px]">播放队列是空的</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/30 px-4 py-3 text-[10px] text-black/30">
            当前索引 {index + 1} / {queue.length}
          </div>
        </motion.aside>
      ]}
    </AnimatePresence>
  )
}
