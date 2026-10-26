import { Loader2, Pause, Play, SkipForward } from 'lucide-react'
import { songArtists, songCover, songDuration } from '../lib/api'
import { formatClock } from '../lib/format'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'

export function MobilePlayer(): React.JSX.Element | null {
  const current = usePlayerStore((state) => state.current)
  const playing = usePlayerStore((state) => state.playing)
  const loading = usePlayerStore((state) => state.loading)
  const time = usePlayerStore((state) => state.time)
  const duration = usePlayerStore((state) => state.duration)
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const setNowPlaying = useUiStore((state) => state.setNowPlaying)

  if (!current) return null

  const total = duration || songDuration(current) / 1000
  const ratio = total > 0 ? Math.min(1, Math.max(0, time / total)) : 0

  return (
    <div className="px-3 pb-2">
      <div className="glass-strong relative flex h-[60px] items-center gap-2.5 overflow-hidden rounded-[20px] border border-white/55 px-2.5 shadow-[0_18px_44px_-24px_rgba(24,32,64,0.4)]">
        <button
          onClick={() => setNowPlaying(true)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:opacity-80"
        >
          <Cover
            src={songCover(current, 140)}
            radius={11}
            className="h-[42px] w-[42px] shrink-0 shadow-[0_5px_14px_-7px_rgba(0,0,0,0.35)]"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-black/85">{current.name}</div>
            <div className="truncate text-[10.5px] text-black/40">{songArtists(current)}</div>
          </div>
        </button>

        <span className="tabular shrink-0 text-[9.5px] text-black/30">
          {formatClock(time)} / {formatClock(total)}
        </span>

        <button
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3559] to-[#d40036] text-white shadow-[0_7px_18px_rgba(255,25,73,0.3)] transition-transform duration-200 active:scale-90"
          aria-label={playing ? '暂停' : '播放'}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          onClick={() => next()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/45 transition-transform duration-200 active:scale-90"
          aria-label="下一首"
        >
          <SkipForward size={17} fill="currentColor" />
        </button>

        <div className="absolute inset-x-2.5 bottom-0 h-[2px] overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff1949] to-[#ff6b8a]"
            style={{ width: `${ratio * 100}%`, transition: 'width 0.25s linear' }}
          />
        </div>
      </div>
    </div>
  )
}
