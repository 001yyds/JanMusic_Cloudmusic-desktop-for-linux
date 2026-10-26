import { useEffect, useState } from 'react'
import { ListPlus, Play } from 'lucide-react'
import type { Playlist } from '../../../shared/types'
import { coverUrl } from '../lib/api'
import { formatCount } from '../lib/format'
import { cachedPlaylist, loadPlaylist } from '../lib/playlistCache'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { TrackList } from '../components/TrackList'

export function PlaylistPage({ id }: { id: number }): React.JSX.Element {
  const [playlist, setPlaylist] = useState<Playlist | null>(cachedPlaylist(id) ?? null)
  const [loading, setLoading] = useState(!cachedPlaylist(id))
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const addToQueue = usePlayerStore((state) => state.addToQueue)

  useEffect(() => {
    let alive = true
    const cached = cachedPlaylist(id)
    if (cached) {
      setPlaylist(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    setPlaylist(null)
    loadPlaylist(id)
      .then((result) => {
        if (alive) setPlaylist(result)
      })
      .catch(() => {
        if (alive) toast('歌单加载失败', 'error')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, toast])

  if (loading && !playlist) {
    return (
      <div className="px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="flex items-end gap-6">
          <div className="skeleton h-[128px] w-[128px] rounded-[20px] sm:h-[186px] sm:w-[186px]" />
          <div className="flex-1 space-y-3 pb-2">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-8 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
        <div className="mt-10 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-12 rounded-[10px]" />
          ))}
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-black/40">
        <p className="text-[13px]">歌单不存在或加载失败</p>
        <button
          onClick={() => navigate({ page: 'home' })}
          className="rounded-full border border-black/10 bg-white/40 px-4 py-1.5 text-[11.5px] transition-all duration-200 hover:bg-white/70 hover:text-black"
        >
          回到首页
        </button>
      </div>
    )
  }

  const tracks = playlist.tracks ?? []
  const cover = coverUrl(playlist.coverImgUrl, 600)
  const creator = playlist.creator

  return (
    <div className="relative min-h-full pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden">
        <img
          src={cover}
          alt=""
          className="h-full w-full scale-125 object-cover opacity-20 blur-[80px] saturate-125"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/25 to-transparent" />
      </div>

      <div className="relative px-4 pt-6 sm:px-8 sm:pt-9">
        <div className="flex items-end gap-4 sm:gap-6">
          <Cover
            src={cover}
            radius={18}
            className="h-[128px] w-[128px] shrink-0 shadow-[0_22px_50px_-22px_rgba(0,0,0,0.4)] sm:h-[186px] sm:w-[186px]"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="text-[9px] uppercase tracking-[0.3em] text-black/40 sm:text-[9.5px] sm:tracking-[0.32em]">Playlist</div>
            <h1 className="mt-1.5 line-clamp-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-black/90 sm:mt-2 sm:text-[28px] xl:text-[32px]">
              {playlist.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-black/45 sm:mt-3 sm:gap-2 sm:text-[11.5px]">
              {creator?.avatarUrl && (
                <img
                  src={coverUrl(creator.avatarUrl, 60)}
                  alt=""
                  className="h-[18px] w-[18px] rounded-full object-cover"
                  draggable={false}
                />
              )}
              <span className="text-black/65">{creator?.nickname ?? '网易云音乐'}</span>
              <span className="text-black/20">/</span>
              <span>{playlist.trackCount ?? tracks.length} 首</span>
              <span className="text-black/20">/</span>
              <span>{formatCount(playlist.playCount)} 次播放</span>
            </div>

            {playlist.description && (
              <p className="mt-2.5 line-clamp-2 max-w-[720px] text-[11px] leading-relaxed text-black/40">
                {playlist.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-2.5">
              <button
                onClick={() => playQueue(tracks, 0)}
                disabled={!tracks.length}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-[11.5px] font-medium text-white shadow-[0_8px_22px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:px-5 sm:text-[12px]"
              >
                <Play size={13} fill="currentColor" />
                播放全部
              </button>
              <button
                onClick={() => addToQueue(tracks)}
                disabled={!tracks.length}
                className="glass-soft flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/40 px-3.5 py-2 text-[11px] text-black/60 transition-all duration-200 hover:bg-white/30 hover:text-black disabled:opacity-40 sm:px-4 sm:text-[11.5px]"
              >
                <ListPlus size={13} />
                加入队列
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel mt-6 rounded-[24px] border border-white/40 p-2 pt-3 sm:mt-8">
          <div className="mb-1 grid grid-cols-[28px_minmax(0,2.4fr)_52px_88px] items-center gap-3 px-3.5 text-[10px] text-black/35 min-[1040px]:grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1.5fr)_52px_88px]">
            <span className="text-center">#</span>
            <span>标题</span>
            <span className="hidden min-[1040px]:block">专辑</span>
            <span className="text-right">时长</span>
            <span />
          </div>
          <TrackList songs={tracks} />
        </div>
      </div>
    </div>
  )
}
