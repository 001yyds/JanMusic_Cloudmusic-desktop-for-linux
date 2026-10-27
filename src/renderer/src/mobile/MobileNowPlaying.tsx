import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  ListOrdered,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Repeat,
  Repeat1,
  ScrollText,
  Shuffle,
  SkipBack,
  SkipForward
} from 'lucide-react'
import { api, songAlbum, songArtists, songCover } from '../lib/api'
import { downloadSong } from '../lib/actions'
import { rgba, useDominantColor } from '../lib/color'
import { cn } from '../lib/cn'
import { formatClock } from '../lib/format'
import { activeLineIndex, parseLyric, type LyricLine } from '../lib/lyrics'
import { useLikesStore } from '../store/likes'
import { usePlayerStore, type PlayMode } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { QualityMenu } from '../components/QualityMenu'
import { Slider } from '../components/Slider'

const MODE_ICON: Record<PlayMode, typeof Repeat> = {
  repeat: Repeat,
  single: Repeat1,
  order: ListOrdered,
  shuffle: Shuffle
}

export function MobileNowPlaying(): React.JSX.Element {
  const open = useUiStore((state) => state.nowPlaying)
  const setOpen = useUiStore((state) => state.setNowPlaying)
  const lyricsOpen = useUiStore((state) => state.lyricsOpen)
  const setLyricsOpen = useUiStore((state) => state.setLyricsOpen)
  const setQueueOpen = useUiStore((state) => state.setQueueOpen)
  const openComments = useUiStore((state) => state.openComments)

  const current = usePlayerStore((state) => state.current)
  const playing = usePlayerStore((state) => state.playing)
  const loading = usePlayerStore((state) => state.loading)
  const time = usePlayerStore((state) => state.time)
  const duration = usePlayerStore((state) => state.duration)
  const mode = usePlayerStore((state) => state.mode)
  const trial = usePlayerStore((state) => state.trial)
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const previous = usePlayerStore((state) => state.previous)
  const seek = usePlayerStore((state) => state.seek)
  const cycleMode = usePlayerStore((state) => state.cycleMode)

  const liked = useLikesStore((state) => state.liked)
  const quality = useSettingsStore((state) => state.settings?.quality ?? 'exhigh')
  const lyricFontSize = useSettingsStore((state) => state.settings?.lyricFontSize ?? 22)

  const [lines, setLines] = useState<LyricLine[]>([])
  const [scrub, setScrub] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const dragControls = useDragControls()

  const largeCover = songCover(current ?? undefined, 800)
  const blurCover = songCover(current ?? undefined, 300)
  const color = useDominantColor(blurCover)

  useEffect(() => {
    if (!current) {
      setLines([])
      return
    }
    let alive = true
    setLines([])
    api.song
      .lyric(current.id)
      .then((result) => {
        if (alive) setLines(parseLyric(result.lrc, result.tlyric))
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [current?.id])

  const active = useMemo(() => activeLineIndex(lines, time), [lines, time])
  const activeText = active >= 0 ? lines[active]?.text : ''

  useEffect(() => {
    if (!lyricsOpen || active < 0) return
    const container = containerRef.current
    const element = lineRefs.current[active]
    if (!container || !element) return
    const top = element.offsetTop - container.clientHeight / 2 + element.clientHeight / 2
    container.scrollTo({ top, behavior: 'smooth' })
  }, [active, lyricsOpen])

  const total = duration || (current?.dt ? current.dt / 1000 : 0)
  const shown = scrub ?? time
  const ModeIcon = MODE_ICON[mode]
  const isLiked = current ? liked.has(current.id) : false
  const album = current ? songAlbum(current) : undefined
  const lyricSize = Math.min(26, Math.max(17, lyricFontSize))

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          key="mobile-now-playing"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 36, stiffness: 330 }}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.42 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 850) setOpen(false)
          }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white/40 backdrop-blur-[54px]"
        >
          <div className="pointer-events-none absolute inset-0">
            {blurCover && (
              <img
                src={blurCover}
                alt=""
                className="absolute inset-0 h-full w-full scale-150 object-cover opacity-55 blur-[110px] saturate-[1.35]"
                draggable={false}
              />
            )}
            <div className="absolute inset-0 bg-white/5" />
            <div
              className="absolute inset-0 transition-[background] duration-700"
              style={{
                background: `radial-gradient(90% 70% at 50% -6%, ${rgba(color, 0.3)} 0%, transparent 66%)`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/45" />
            <div className="absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(255,255,255,0.14)]" />
            <div className="grain absolute inset-0" />
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('button')) return
                dragControls.start(event)
              }}
              className="mobile-header flex shrink-0 items-center px-4 pb-1"
            >
              <button
                onClick={() => setOpen(false)}
                className="glass-soft flex h-9 w-9 items-center justify-center rounded-full text-black/55 transition-transform duration-200 active:scale-90"
                aria-label="收起"
              >
                <ChevronDown size={20} />
              </button>
              <div className="pointer-events-none min-w-0 flex-1 px-3 text-center">
                <div className="text-[9px] uppercase tracking-[0.28em] text-black/40">
                  {lyricsOpen ? '歌词' : '正在播放'}
                </div>
                <div className="truncate text-[11px] text-black/50">{album?.name ?? 'JanMusic'}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openComments(current)}
                  className="glass-soft flex h-9 w-9 items-center justify-center rounded-full text-black/50 transition-transform duration-200 active:scale-90"
                  aria-label="评论"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  onClick={() => setLyricsOpen(!lyricsOpen)}
                  className={cn(
                    'glass-soft flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-90',
                    lyricsOpen ? 'text-brand' : 'text-black/50'
                  )}
                  aria-label="歌词"
                >
                  <ScrollText size={16} />
                </button>
                <button
                  onClick={() => {
                    setOpen(false)
                    setQueueOpen(true)
                  }}
                  className="glass-soft flex h-9 w-9 items-center justify-center rounded-full text-black/50 transition-transform duration-200 active:scale-90"
                  aria-label="播放队列"
                >
                  <ListMusic size={16} />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {lyricsOpen ? (
                <div
                  ref={containerRef}
                  className={cn(
                    'no-scrollbar relative h-full overflow-y-auto px-6 [mask-image:linear-gradient(to_bottom,transparent_0%,black_12%,black_88%,transparent_100%)]',
                    lines.length ? 'pb-[26vh] pt-[18vh]' : 'flex items-center justify-center'
                  )}
                >
                  {lines.map((line, index) => {
                    const isActive = index === active
                    return (
                      <button
                        key={`${line.time}-${index}`}
                        ref={(element) => {
                          lineRefs.current[index] = element
                        }}
                        onClick={() => seek(line.time)}
                        className={cn(
                          'block w-full py-2.5 text-left transition-all duration-300',
                          isActive ? 'text-black' : 'text-black/35'
                        )}
                      >
                        <div
                          className={cn('origin-left transition-all duration-300', isActive ? 'scale-[1.03] font-semibold' : '')}
                          style={{ fontSize: isActive ? lyricSize : Math.round(lyricSize * 0.82) }}
                        >
                          {line.text}
                        </div>
                        {line.translation && (
                          <div
                            className={cn('mt-0.5', isActive ? 'text-black/55' : 'text-black/25')}
                            style={{ fontSize: Math.max(11, Math.round(lyricSize * 0.58)) }}
                          >
                            {line.translation}
                          </div>
                        )}
                      </button>
                    )
                  })}
                  {!lines.length && (
                    <div className="text-center text-[13px] text-black/25">纯音乐，请欣赏</div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-7">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    className="relative"
                  >
                    <div
                      className="absolute -inset-5 rounded-full blur-[52px]"
                      style={{ background: rgba(color, playing ? 0.4 : 0.24) }}
                    />
                    <Cover
                      src={largeCover}
                      radius={24}
                      className="relative w-[min(72vw,300px)] shadow-[0_34px_80px_-30px_rgba(0,0,0,0.42)]"
                      imgClassName="aspect-square"
                    />
                  </motion.div>

                  <div className="mt-7 flex w-full max-w-[340px] items-start gap-2 px-1">
                    <div className="min-w-0 flex-1 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <h1 className="truncate text-[21px] font-semibold tracking-[-0.02em] text-black/90">
                          {current.name}
                        </h1>
                        {trial && (
                          <span className="shrink-0 rounded-[4px] border border-brand/40 px-1.5 py-[1px] text-[8.5px] leading-[13px] text-brand">
                            试听
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[12px] text-black/45">{songArtists(current)}</p>
                    </div>
                    <button
                      onClick={() => void useLikesStore.getState().toggle(current)}
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 active:scale-90',
                        isLiked ? 'text-brand' : 'text-black/35'
                      )}
                      aria-label={isLiked ? '取消喜欢' : '喜欢'}
                    >
                      <Heart size={19} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <button
                    onClick={() => setLyricsOpen(true)}
                    className="mt-4 max-w-[320px] truncate px-4 text-center text-[13px] text-black/45 active:opacity-70"
                  >
                    {lines.length ? activeText || '···' : '纯音乐，请欣赏'}
                  </button>
                </div>
              )}
            </div>

            <footer className="shrink-0 px-5 pb-1">
              <div className="flex items-center gap-2.5">
                <span className="tabular w-9 text-right text-[10px] text-black/40">{formatClock(shown)}</span>
                <Slider
                  value={shown}
                  max={total || 1}
                  onChange={setScrub}
                  onCommit={(value) => {
                    seek(value)
                    setScrub(null)
                  }}
                  className="flex-1"
                  preview={(ratio) => formatClock(ratio * total)}
                />
                <span className="tabular w-9 text-[10px] text-black/40">{formatClock(total)}</span>
              </div>

              <div className="mt-3 flex items-center justify-center gap-7">
                <button
                  onClick={cycleMode}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-black/45 transition-transform duration-200 active:scale-90"
                  aria-label="播放模式"
                >
                  <ModeIcon size={17} />
                </button>
                <button
                  onClick={previous}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-black/65 transition-transform duration-200 active:scale-90"
                  aria-label="上一首"
                >
                  <SkipBack size={25} fill="currentColor" />
                </button>
                <button
                  onClick={toggle}
                  className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-gradient-to-br from-[#ff3559] to-[#d40036] text-white shadow-[0_14px_38px_rgba(255,25,73,0.3)] transition-transform duration-200 active:scale-95"
                  aria-label={playing ? '暂停' : '播放'}
                >
                  {loading ? (
                    <Loader2 size={26} className="animate-spin" />
                  ) : playing ? (
                    <Pause size={25} fill="currentColor" />
                  ) : (
                    <Play size={25} fill="currentColor" className="ml-1" />
                  )}
                </button>
                <button
                  onClick={() => next()}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-black/65 transition-transform duration-200 active:scale-90"
                  aria-label="下一首"
                >
                  <SkipForward size={25} fill="currentColor" />
                </button>
                <button
                  onClick={() => current && void downloadSong(current, quality)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-black/40 transition-transform duration-200 active:scale-90"
                  aria-label="下载"
                >
                  <Download size={17} />
                </button>
              </div>

              <div className="mobile-bottom mt-2 flex items-center justify-center gap-2 pb-1">
                <span className="text-[9.5px] uppercase tracking-[0.24em] text-black/30">音质</span>
                <QualityMenu align="left" className="px-2.5 py-[3px] text-[10.5px]" />
              </div>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
