import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import type { Playlist, Song } from '../../../shared/types'
import { api, coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { PlaylistCard } from '../components/PlaylistCard'
import { TrackList } from '../components/TrackList'

type Tab = 'songs' | 'playlists' | 'artists'

interface Artist {
  id: number
  name: string
  picUrl?: string
  albumSize?: number
  fansCount?: number
}

const cache = new Map<
  string,
  { songs: Song[]; playlists: Playlist[]; artists: Artist[]; counts: { songs: number; playlists: number; artists: number } }
>()

export function SearchPage({ initialKeyword }: { initialKeyword?: string }): React.JSX.Element {
  const [keyword, setKeyword] = useState(initialKeyword ?? '')
  const [tab, setTab] = useState<Tab>('songs')
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [counts, setCounts] = useState({ songs: 0, playlists: 0, artists: 0 })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useUiStore((state) => state.toast)
  const route = useUiStore((state) => state.route)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (route.page === 'search' && route.keyword !== undefined) setKeyword(route.keyword)
  }, [route])

  useEffect(() => {
    const query = keyword.trim()
    if (!query) {
      setSongs([])
      setPlaylists([])
      setArtists([])
      setCounts({ songs: 0, playlists: 0, artists: 0 })
      setSearched(false)
      setLoading(false)
      return
    }
    const cached = cache.get(query)
    if (cached) {
      setSongs(cached.songs)
      setPlaylists(cached.playlists)
      setArtists(cached.artists)
      setCounts(cached.counts)
      setSearched(true)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const [songResult, playlistResult, artistResult] = await Promise.all([
          api.search.query(query, 1),
          api.search.query(query, 1000),
          api.search.query(query, 100)
        ])
        const payload = {
          songs: songResult.songs ?? [],
          playlists: playlistResult.playlists ?? [],
          artists: artistResult.artists ?? [],
          counts: {
            songs: songResult.songCount ?? songResult.songs?.length ?? 0,
            playlists: playlistResult.playlistCount ?? playlistResult.playlists?.length ?? 0,
            artists: artistResult.artistCount ?? artistResult.artists?.length ?? 0
          }
        }
        cache.set(query, payload)
        setSongs(payload.songs)
        setPlaylists(payload.playlists)
        setArtists(payload.artists)
        setCounts(payload.counts)
        setSearched(true)
      } catch {
        toast('搜索失败，请稍后再试', 'error')
      } finally {
        setLoading(false)
      }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [keyword, toast])

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'songs', label: '单曲', count: counts.songs },
    { key: 'playlists', label: '歌单', count: counts.playlists },
    { key: 'artists', label: '歌手', count: counts.artists }
  ]

  return (
    <div className="relative min-h-full px-4 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(60%_100%_at_40%_0%,rgba(255,25,73,0.06),transparent_70%)]" />

      <div className="relative mx-auto max-w-[900px]">
        <div className="glass flex items-center gap-2.5 rounded-[18px] border border-white/45 px-4 py-3 transition-colors duration-200 focus-within:border-white/70 sm:gap-3 sm:rounded-[20px] sm:px-5 sm:py-3.5">
          <Search size={18} className={cn('shrink-0 transition-colors duration-200 sm:h-5 sm:w-5', keyword ? 'text-brand' : 'text-black/35')} />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索歌曲、歌手、歌单"
            className="w-full bg-transparent text-[17px] font-medium tracking-[-0.02em] text-black/90 outline-none placeholder:text-black/20 sm:text-[24px]"
            spellCheck={false}
          />
          {loading && <Loader2 size={18} className="animate-spin text-black/30" />}
          {keyword && !loading && (
            <button
              onClick={() => {
                setKeyword('')
                inputRef.current?.focus()
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/30 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {searched && (
          <div className="no-scrollbar mt-4 flex items-center gap-5 overflow-x-auto sm:mt-5 sm:gap-6">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  'relative pb-2 text-[12.5px] transition-colors duration-200',
                  tab === item.key ? 'text-black' : 'text-black/45 hover:text-black/70'
                )}
              >
                {item.label}
                <span className="ml-1 text-[10px] text-black/25">{item.count}</span>
                {tab === item.key && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand" />}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          {!keyword && (
            <div className="flex flex-col items-center justify-center pt-[16vh] text-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 rounded-full bg-brand/10 blur-[50px]" />
                <Search size={40} strokeWidth={1.2} className="text-black/15" />
              </div>
              <p className="mt-5 text-[13px] text-black/35">输入关键词，发现你想听的音乐</p>
              <p className="mt-1 text-[11px] text-black/20">支持歌曲、歌手与歌单搜索</p>
            </div>
          )}

          {keyword && searched && tab === 'songs' && (
            <div className="glass-panel rounded-[22px] border border-white/40 p-2">
              {songs.length ? (
                <TrackList songs={songs} />
              ) : (
                <p className="py-16 text-center text-[12px] text-black/35">没有找到相关单曲</p>
              )}
            </div>
          )}

          {keyword && searched && tab === 'playlists' && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
              {playlists.length ? (
                playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关歌单</p>
              )}
            </div>
          )}

          {keyword && searched && tab === 'artists' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-6">
              {artists.length ? (
                artists.map((artist) => (
                  <div key={artist.id} className="glass-tile flex flex-col items-center rounded-[22px] border border-white/40 p-4 text-center">
                    <Cover
                      src={coverUrl(artist.picUrl, 300)}
                      radius={999}
                      className="h-[118px] w-[118px] shadow-[0_14px_34px_-20px_rgba(0,0,0,0.4)]"
                    />
                    <div className="mt-3 truncate text-[12.5px] text-black/80">{artist.name}</div>
                    <div className="mt-0.5 text-[10px] text-black/35">{artist.albumSize ?? 0} 张专辑</div>
                  </div>
                ))
              ) : (
                <p className="col-span-full py-16 text-center text-[12px] text-black/30">没有找到相关歌手</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
