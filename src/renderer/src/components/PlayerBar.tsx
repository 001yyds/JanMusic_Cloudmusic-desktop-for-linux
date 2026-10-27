import { useState } from 'react'
import {
  ChevronUp,
  Heart,
  ListMusic,
  ListOrdered,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  ScrollText,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX
} from 'lucide-react'
import { songArtists, songCover, songDuration } from '../lib/api'
import { cn } from '../lib/cn'
import { formatClock } from '../lib/format'
import { useLikesStore } from '../store/likes'
import { usePlayerStore, type PlayMode } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'
import { QualityMenu } from './QualityMenu'
import { Slider } from './Slider'

const MODE_ICON: Record<PlayMode, typeof Repeat> = {
  repeat: Repeat,
  single: Repeat1,
  order: ListOrdered,
  shuffle: Shuffle
}

const MODE_LABEL: Record<PlayMode, string> = {
  repeat: '列表循环',
  single: '单曲循环',
  order: '顺序播放',
  shuffle: '随机播放'
}

export function PlayerBar(): React.JSX.Element {
  const current = usePlayerStore((state) => state.current)
  const playing = usePlayerStore((state) => state.playing)
  const loading = usePlayerStore((state) => state.loading)
  const time = usePlayerStore((state) => state.time)
  const duration = usePlayerStore((state) => state.duration)
  const volume = usePlayerStore((state) => state.volume)
  const muted = usePlayerStore((state) => state.muted)
  const mode = usePlayerStore((state) => state.mode)
  const trial = usePlayerStore((state) => state.trial)
  const queue = usePlayerStore((state) => state.queue)
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const previous = usePlayerStore((state) => state.previous)
  const seek = usePlayerStore((state) => state.seek)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const toggleMute = usePlayerStore((state) => state.toggleMute)
  const cycleMode = usePlayerStore((state) => state.cycleMode)

  const queueOpen = useUiStore((state) => state.queueOpen)
  const nowPlayingOpen = useUiStore((state) => state.nowPlaying)
  const setQueueOpen = useUiStore((state) => state.setQueueOpen)
  const setNowPlaying = useUiStore((state) => state.setNowPlaying)
  const setLyricsOpen = useUiStore((state) => state.setLyricsOpen)

  const liked = useLikesStore((state) => state.liked)
  const [scrub, setScrub] = useState<number | null>(null)

  const total = duration || (current ? songDuration(current) / 1000 : 0)
  const shown = scrub ?? time
  const ModeIcon = MODE_ICON[mode]
  const isLiked = current ? liked.has(current.id) : false
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <footer
      className={cn(
        'lg-bar lg-bar-bottom relative z-30 h-[88px] shrink-0 overflow-hidden border-t border-white/45 transition-all duration-300',
        nowPlayingOpen && 'pointer-events-none translate-y-2 opacity-0'
      )}
    >
      <div className="liquid-sheen" />

      <div className="relative z-10 grid h-full grid-cols-[minmax(170px,1fr)_minmax(300px,1.45fr)_minmax(170px,1fr)] items-center gap-4 px-5 xl:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => current && setNowPlaying(true)}
            className="group relative h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[12px] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)] transition-transform duration-300 active:scale-[0.97]"
          >
            <Cover src={songCover(current ?? undefined, 160)} radius={12} className="h-[54px] w-[54px]" />
            <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
              <ChevronUp size={18} className="text-white" />
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <button
                data-song-id={current?.id ?? ''}
                onClick={() => current && setNowPlaying(true)}
                className="truncate text-left text-[13px] font-medium text-black/90 transition-colors duration-200 hover:text-black"
              >
                {current?.name ?? '未在播放'}
              </button>
              {trial && (
                <span className="shrink-0 rounded-[4px] border border-brand/35 px-1 text-[8px] leading-[13px] text-brand">
                  试听
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-black/45">
              {current ? songArtists(current) : '从歌单里挑一首开始'}
            </div>
          </div>

          <button
            onClick={() => current && void useLikesStore.getState().toggle(current)}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
              isLiked ? 'text-brand' : 'text-black/35 hover:bg-white/30 hover:text-black/70'
            )}
            title={isLiked ? '取消喜欢' : '喜欢'}
          >
            <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-1.5">
          <div className="flex items-center gap-5 xl:gap-6">
            <button
              onClick={cycleMode}
              title={MODE_LABEL[mode]}
              className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
            >
              <ModeIcon size={16} />
            </button>
            <button
              onClick={previous}
              title="上一首"
              className="flex h-8 w-8 items-center justify-center rounded-full text-black/65 transition-all duration-200 hover:text-black active:scale-90"
            >
              <SkipBack size={19} fill="currentColor" />
            </button>
            <button
              onClick={toggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3559] to-[#d40036] text-white shadow-[0_8px_22px_rgba(255,25,73,0.32)] transition-all duration-200 hover:scale-[1.05] active:scale-95"
              title={playing ? '暂停' : '播放'}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : playing ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={() => next()}
              title="下一首"
              className="flex h-8 w-8 items-center justify-center rounded-full text-black/65 transition-all duration-200 hover:text-black active:scale-90"
            >
              <SkipForward size={19} fill="currentColor" />
            </button>
            <button
              onClick={() => {
                setNowPlaying(true)
                setLyricsOpen(true)
              }}
              title="歌词"
              className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
            >
              <ScrollText size={16} />
            </button>
          </div>

          <div className="flex w-full items-center gap-3">
            <span className="tabular w-9 text-right text-[10.5px] text-black/40">{formatClock(shown)}</span>
            <Slider
              value={shown}
              max={total || 1}
              onChange={(value) => setScrub(value)}
              onCommit={(value) => {
                seek(value)
                setScrub(null)
              }}
              className="flex-1"
              preview={(ratio) => formatClock(ratio * total)}
            />
            <span className="tabular w-9 text-[10.5px] text-black/40">{formatClock(total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 xl:gap-3">
          <QualityMenu />
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full text-black/40 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
              title={muted ? '取消静音' : '静音'}
            >
              <VolumeIcon size={16} />
            </button>
            <Slider
              value={muted ? 0 : volume}
              max={1}
              onChange={setVolume}
              className="w-[60px] xl:w-[76px]"
              accent="rgba(0,0,0,0.62)"
            />
          </div>
          <button
            onClick={() => setQueueOpen(!queueOpen)}
            title="播放队列"
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
              queueOpen ? 'bg-brand/12 text-brand' : 'text-black/40 hover:bg-white/30 hover:text-black'
            )}
          >
            <ListMusic size={17} />
            {queue.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-1 text-[8px] font-semibold text-white">
                {queue.length > 99 ? '99+' : queue.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </footer>
  )
}
