import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Download,
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
import type { LyricLine } from '../lib/lyrics'
import { activeLineIndex, parseLyric } from '../lib/lyrics'
import { downloadSong } from '../lib/actions'
import { api, songAlbum, songArtists, songCover } from '../lib/api'
import { rgba, useDominantColor } from '../lib/color'
import { cn } from '../lib/cn'
import { formatClock } from '../lib/format'
import { useLikesStore } from '../store/likes'
import { usePlayerStore, type PlayMode } from '../store/player'
import { useSettingsStore } from '../store/settings'
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

export function NowPlaying(): React.JSX.Element {
  const open = useUiStore((state) => state.nowPlaying)
  const setOpen = useUiStore((state) => state.setNowPlaying)
  const lyricsOpen = useUiStore((state) => state.lyricsOpen)
  const setLyricsOpen = useUiStore((state) => state.setLyricsOpen)
  const setQueueOpen = useUiStore((state) => state.setQueueOpen)

  const current = usePlayerStore((state) => state.current)
  const playing = usePlayerStore((state) => state.playing)
  const loading = usePlayerStore((state) => state.loading)
  const time = usePlayerStore((state) => state.time)
  const duration = usePlayerStore((state) => state.duration)
  const volume = usePlayerStore((state) => state.volume)
  const muted = usePlayerStore((state) => state.muted)
  const mode = usePlayerStore((state) => state.mode)
  const trial = usePlayerStore((state) => state.trial)
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const previous = usePlayerStore((state) => state.previous)
  const seek = usePlayerStore((state) => state.seek)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const toggleMute = usePlayerStore((state) => state.toggleMute)
  const cycleMode = usePlayerStore((state) => state.cycleMode)

  const liked = useLikesStore((state) => state.liked)
  const quality = useSettingsStore((state) => state.settings?.quality ?? 'exhigh')
  const lyricFontSize = useSettingsStore((state) => state.settings?.lyricFontSize ?? 22)

  const [lines, setLines] = useState<LyricLine[]>([])
  const [scrub, setScrub] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])

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
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          key="now-playing"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 38, stiffness: 340 }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white/45 backdrop-blur-[54px]"
        >
          <div className="pointer-events-none absolute inset-0">
            {blurCover && (
              <img
                src={blurCover}
                alt=""
                className="absolute inset-0 h-full w-full scale-150 object-cover opacity-60 blur-[120px] saturate-[1.35]"
                draggable={false}
              />
            )}
            <div className="absolute inset-0 bg-white/5" />
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(65% 55% at 16% 0%, rgba(255,25,73,0.07) 0%, transparent 62%)'
              }}
            />
            <div
              className="absolute inset-0 transition-[background] duration-700"
              style={{
                background: `radial-gradient(95% 80% at 50% -4%, ${rgba(color, 0.28)} 0%, transparent 64%)`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/45" />
            <div className="absolute inset-0 shadow-[inset_0_0_200px_70px_rgba(255,255,255,0.12)]" />
            <div className="grain absolute inset-0" />
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <header className="drag flex h-16 shrink-0 items-center bg-gradient-to-b from-white/10 to-transparent px-6">
              <button
                onClick={() => setOpen(false)}
                className="no-drag flex h-9 w-9 items-center justify-center rounded-full text-black/50 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
              >
                <ChevronDown size={21} />
              </button>
              <div className="pointer-events-none ml-2 min-w-0 flex-1 text-center">
                <div className="text-[10px] uppercase tracking-[0.28em] text-black/45">正在播放</div>
                <div className="truncate text-[11.5px] text-black/55">{album?.name ?? 'JanMusic'}</div>
              </div>
              <div className="no-drag flex items-center gap-1">
                <button
                  onClick={() => setLyricsOpen(!lyricsOpen)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
                    lyricsOpen ? 'text-brand' : 'text-black/45 hover:bg-white/30 hover:text-black'
                  )}
                  title="歌词"
                >
                  <ScrollText size={17} />
                </button>
                <button
                  onClick={() => {
                    setOpen(false)
                    setQueueOpen(true)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-black/45 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
                  title="播放队列"
                >
                  <ListMusic size={17} />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 items-stretch gap-6 px-8 pb-2">
              <div
                className={cn(
                  'flex flex-col items-center justify-center transition-[flex-basis,width] duration-500',
                  lyricsOpen ? 'min-w-[300px] flex-[0_0_40%]' : 'w-full flex-1'
                )}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute rounded-full blur-[70px] transition-all duration-700"
                    style={{
                      background: rgba(color, playing ? 0.4 : 0.24),
                      width: lyricsOpen ? 240 : 320,
                      height: lyricsOpen ? 240 : 320
                    }}
                  />
                  <div
                    className="relative aspect-square transition-[width,height] duration-500"
                    style={{ width: lyricsOpen ? 'clamp(180px, 24vh, 250px)' : 'clamp(240px, 38vh, 380px)' }}
                  >
                    <Cover
                      src={largeCover}
                      radius={lyricsOpen ? 20 : 26}
                      className="h-full w-full shadow-[0_36px_90px_-30px_rgba(0,0,0,0.4)]"
                    />
                  </div>
                </div>

                <div className="mt-7 flex max-w-[560px] items-center justify-center gap-2 text-center">
                  <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em] text-black/90">
                    {current.name}
                  </h1>
                  {trial && (
                    <span className="shrink-0 rounded-[4px] border border-brand/40 px-1.5 py-[1px] text-[9px] leading-[14px] text-brand">
                      试听
                    </span>
                  )}
                </div>

                {!lyricsOpen && (
                  <button
                    onClick={() => setLyricsOpen(true)}
                    className="mt-5 max-w-[520px] truncate px-4 text-center text-[14px] text-black/50 transition-colors duration-200 hover:text-black/80"
                  >
                    {lines.length ? activeText || '···' : '纯音乐，请欣赏'}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {lyricsOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 26 }}
                    transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                    className="relative flex min-w-0 flex-1 flex-col pt-1"
                  >
                    <div
                      ref={containerRef}
                      className="no-scrollbar relative h-full overflow-y-auto py-[32vh] pr-6 [mask-image:linear-gradient(to_bottom,transparent_0%,black_13%,black_87%,transparent_100%)]"
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
                              'block w-full py-2 text-left transition-all duration-300',
                              isActive ? 'text-black' : 'text-black/40 hover:text-black/65'
                            )}
                          >
                            <div
                              className={cn(
                                'origin-left transition-all duration-300',
                                isActive ? 'scale-[1.035] font-semibold' : ''
                              )}
                              style={{ fontSize: isActive ? lyricFontSize : Math.round(lyricFontSize * 0.82) }}
                            >
                              {line.text}
                            </div>
                            {line.translation && (
                              <div
                                className={cn(
                                  'mt-0.5 transition-colors duration-300',
                                  isActive ? 'text-black/55' : 'text-black/30'
                                )}
                                style={{ fontSize: Math.max(10, Math.round(lyricFontSize * 0.56)) }}
                              >
                                {line.translation}
                              </div>
                            )}
                          </button>
                        )
                      })}
                      {!lines.length && (
                        <div className="flex h-full items-center justify-center text-[13px] text-black/25">
                          暂无歌词
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="relative z-10 shrink-0 px-6 pb-5 pt-2">
              <div className="glass-strong mx-auto flex max-w-[760px] flex-col gap-3 rounded-[26px] border border-white/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="tabular w-10 text-right text-[10.5px] text-black/40">
                    {formatClock(shown)}
                  </span>
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
                  <span className="tabular w-10 text-[10.5px] text-black/40">{formatClock(total)}</span>
                </div>

                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={cycleMode}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-black/45 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
                    title="播放模式"
                  >
                    <ModeIcon size={17} />
                  </button>
                  <button
                    onClick={previous}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-black/65 transition-all duration-200 hover:scale-105 hover:text-black active:scale-90"
                    title="上一首"
                  >
                    <SkipBack size={24} fill="currentColor" />
                  </button>
                  <button
                    onClick={toggle}
                    className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-[#ff3559] to-[#d40036] text-white shadow-[0_14px_38px_rgba(255,25,73,0.3)] transition-all duration-200 hover:scale-[1.04] active:scale-95"
                    title={playing ? '暂停' : '播放'}
                  >
                    {loading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : playing ? (
                      <Pause size={23} fill="currentColor" />
                    ) : (
                      <Play size={23} fill="currentColor" className="ml-1" />
                    )}
                  </button>
                  <button
                    onClick={() => next()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-black/65 transition-all duration-200 hover:scale-105 hover:text-black active:scale-90"
                    title="下一首"
                  >
                    <SkipForward size={24} fill="currentColor" />
                  </button>
                  <button
                    onClick={() => current && void useLikesStore.getState().toggle(current)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
                      isLiked ? 'text-brand' : 'text-black/40 hover:bg-white/30 hover:text-black'
                    )}
                    title="喜欢"
                  >
                    <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="mt-1 flex items-center justify-center gap-5 text-black/45">
                  <button
                    onClick={() => current && void downloadSong(current, quality)}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
                    title="下载"
                  >
                    <Download size={16} />
                  </button>
                  <QualityMenu align="left" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-90"
                      title={muted ? '取消静音' : '静音'}
                    >
                      <VolumeIcon size={16} />
                    </button>
                    <Slider
                      value={muted ? 0 : volume}
                      max={1}
                      onChange={setVolume}
                      className="w-[88px]"
                      accent="rgba(0,0,0,0.6)"
                    />
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
