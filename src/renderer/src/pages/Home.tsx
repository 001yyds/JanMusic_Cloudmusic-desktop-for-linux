import { useEffect } from 'react'
import { Heart, Play, Sparkles, TrendingUp } from 'lucide-react'
import { coverUrl, songArtists, songCover } from '../lib/api'
import { rgba, useDominantColor } from '../lib/color'
import { greeting, todayLabel } from '../lib/format'
import { useAuthStore } from '../store/auth'
import { useContentStore } from '../store/content'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { PlaylistCard } from '../components/PlaylistCard'
import { SectionHeader } from '../components/SectionHeader'

function HeroSkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="skeleton col-span-3 h-[208px] rounded-[20px] min-[1100px]:col-span-2" />
      <div className="skeleton hidden h-[208px] rounded-[20px] min-[1100px]:block" />
    </div>
  )
}

export function Home(): React.JSX.Element {
  const { daily, playlists, newsongs, toplists, loading, load } = useContentStore()
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const profile = useAuthStore((state) => state.profile)
  const authPlaylists = useAuthStore((state) => state.playlists)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const navigate = useUiStore((state) => state.navigate)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const play = usePlayerStore((state) => state.play)

  useEffect(() => {
    void load()
  }, [load])

  const heroCover = daily[0] ? songCover(daily[0], 500) : ''
  const heroColor = useDominantColor(heroCover || undefined)
  const likedPlaylist = authPlaylists.find((playlist) => playlist.specialType === 5)

  return (
    <div className="relative min-h-full px-4 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(70%_100%_at_25%_0%,rgba(255,25,73,0.08),transparent_70%)]" />

      <header className="relative mb-6 flex items-end justify-between gap-3 sm:mb-7">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">{todayLabel()}</p>
          <h1 className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:mt-2.5 sm:text-[32px]">
            {greeting()}
            {profile ? `，${profile.nickname}` : ''}
          </h1>
          <p className="mt-2 text-[12px] text-black/40 sm:mt-2.5 sm:text-[12.5px]">今天想听点什么？</p>
        </div>
        {loggedIn && (
          <button
            onClick={() => navigate({ page: 'library' })}
            className="glass-soft hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-[11.5px] text-black/55 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-[0.97] sm:flex"
          >
            <Sparkles size={13} className="text-brand" />
            我的音乐库
          </button>
        )}
      </header>

      <div className="relative">
        {loading && !playlists.length ? (
          <HeroSkeleton />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {loggedIn ? (
              <div className="glass-panel relative col-span-3 h-[208px] overflow-hidden rounded-[22px] border border-white/50 min-[1100px]:col-span-2">
                {heroCover && (
                  <img
                    src={heroCover}
                    alt=""
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-[24px]"
                    draggable={false}
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(100deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.14) 52%, ${rgba(heroColor, 0.3)} 100%)`
                  }}
                />
                <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
                  <div>
                    <div className="text-[9.5px] uppercase tracking-[0.34em] text-black/40">Daily Mix</div>
                    <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-black/90 sm:text-[26px]">每日推荐</h2>
                    <p className="mt-1.5 text-[11.5px] text-black/50">
                      根据你的口味生成 · {daily.length || 30} 首
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => daily.length && playQueue(daily, 0)}
                      className="flex items-center gap-2 rounded-full bg-brand px-4 py-[7px] text-[12px] font-medium text-white shadow-[0_6px_18px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
                    >
                      <Play size={13} fill="currentColor" />
                      播放全部
                    </button>
                    <button
                      onClick={() => navigate({ page: 'daily' })}
                      className="rounded-full border border-white/50 bg-white/20 px-4 py-[7px] text-[11.5px] text-black/60 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-[0.97]"
                    >
                      查看全部
                    </button>
                  </div>
                </div>
                <div className="absolute right-7 top-1/2 hidden -translate-y-1/2 lg:block">
                  <div className="rotate-[4deg]">
                    <Cover
                      src={heroCover}
                      radius={18}
                      className="h-[148px] w-[148px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel relative col-span-3 h-[208px] overflow-hidden rounded-[22px] border border-white/50 p-5 min-[1100px]:col-span-2 sm:p-7">
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <div className="text-[9.5px] uppercase tracking-[0.34em] text-black/35">NetEase Cloud Music</div>
                    <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-black/90 sm:text-[26px]">登录网易云音乐</h2>
                    <p className="mt-1.5 text-[11.5px] text-black/50">
                      扫码登录后同步你的歌单、每日推荐与喜欢
                    </p>
                  </div>
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="w-fit rounded-full bg-brand px-5 py-[8px] text-[12px] font-medium text-white shadow-[0_6px_18px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
                  >
                    立即扫码登录
                  </button>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-16 h-[260px] w-[260px] rounded-full bg-brand/10 blur-[70px]" />
                {playlists[0] && (
                  <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 sm:block xl:hidden">
                    <div className="rotate-[5deg]">
                      <Cover
                        src={coverUrl(playlists[0].coverImgUrl ?? playlists[0].picUrl, 400)}
                        radius={18}
                        className="h-[148px] w-[148px] opacity-95 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
                      />
                    </div>
                  </div>
                )}
                {playlists.length > 0 && (
                  <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 xl:block">
                    <div className="relative h-[176px] w-[236px]">
                      {playlists.slice(0, 3).map((playlist, index) => (
                        <div
                          key={playlist.id}
                          className="absolute"
                          style={{
                            left: index * 44,
                            top: index * 10,
                            transform: `rotate(${index * 5 - 5}deg)`,
                            zIndex: 3 - index
                          }}
                        >
                          <Cover
                            src={coverUrl(playlist.coverImgUrl ?? playlist.picUrl, 300)}
                            radius={16}
                            className="h-[152px] w-[152px] shadow-[0_20px_44px_-18px_rgba(0,0,0,0.45)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className="glass-panel relative col-span-1 hidden h-[208px] overflow-hidden rounded-[22px] border border-white/50 p-5 min-[1100px]:block"
              style={{
                background: `linear-gradient(150deg, rgba(255,255,255,0.34), ${rgba(heroColor, 0.26)} 72%)`
              }}
            >
              {likedPlaylist?.coverImgUrl && (
                <img
                  src={coverUrl(likedPlaylist.coverImgUrl, 400)}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-[16px]"
                  draggable={false}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/25 via-white/10 to-transparent" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase tracking-[0.3em] text-black/40">Favorites</span>
                  <Heart size={16} className="text-black/30" />
                </div>
                <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-black/90">我喜欢的音乐</h3>
                <p className="mt-1 text-[11px] text-black/45">
                  {likedPlaylist?.trackCount ? `${likedPlaylist.trackCount} 首` : '登录后同步'}
                </p>
              </div>
              <div className="absolute bottom-4 left-5 right-5 z-10 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (likedPlaylist) navigate({ page: 'playlist', id: likedPlaylist.id, title: likedPlaylist.name })
                    else setLoginOpen(true)
                  }}
                  className="flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-4 py-[7px] text-[11.5px] text-black/70 transition-all duration-200 hover:bg-white/45 hover:text-black active:scale-[0.97]"
                >
                  <Play size={12} fill="currentColor" />
                  {likedPlaylist ? '打开歌单' : '去登录'}
                </button>
              </div>
              <div className="pointer-events-none absolute -bottom-10 -right-6 flex h-[130px] w-[130px] items-center justify-center rounded-full border border-black/[0.06] bg-white/30">
                <Heart size={38} className="text-black/10" />
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="relative mt-9">
        <SectionHeader
          title="推荐歌单"
          subtitle="按照你的口味持续更新"
          action={
            <button
              onClick={() => navigate({ page: 'library' })}
              className="text-[11px] text-black/35 transition-colors duration-200 hover:text-black/70"
            >
              更多
            </button>
          }
        />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
          {playlists.slice(0, 12).map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
          {loading && !playlists.length &&
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-square w-full rounded-[18px]" />
                <div className="skeleton mt-3 h-3 w-3/4 rounded" />
              </div>
            ))}
        </div>
      </section>

      {newsongs.length > 0 && (
        <section className="relative mt-10">
          <SectionHeader title="新歌速递" subtitle="刚刚发行的好音乐" />
          <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {newsongs.slice(0, 14).map((song) => (
              <button
                key={song.id}
                onClick={() => play(song, newsongs)}
                className="glass-tile group w-[158px] shrink-0 rounded-[20px] border border-white/40 p-1.5 text-left"
              >
                <div className="relative">
                  <Cover
                    src={songCover(song, 300)}
                    radius={14}
                    className="aspect-square w-full"
                    imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur">
                      <Play size={15} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 truncate px-1 text-[12px] text-black/80 group-hover:text-black">{song.name}</div>
                <div className="truncate px-1 pb-0.5 text-[10.5px] text-black/40">{songArtists(song)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {toplists.length > 0 && (
        <section className="relative mt-10">
          <SectionHeader title="排行榜" subtitle="每周更新的热门榜单" />
          <div className="grid grid-cols-1 gap-3 min-[1000px]:grid-cols-3">
            {toplists.slice(0, 3).map((list) => (
              <button
                key={list.id}
                onClick={() => navigate({ page: 'playlist', id: list.id, title: list.name })}
                className="glass-soft group flex gap-3 rounded-[18px] border border-white/40 p-3 text-left transition-all duration-200 hover:bg-white/30 active:scale-[0.99]"
              >
                <Cover src={coverUrl(list.coverImgUrl, 180)} radius={12} className="h-[88px] w-[88px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-brand" />
                    <span className="truncate text-[12.5px] font-medium text-black/80">{list.name}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[9.5px] text-black/35">{list.updateFrequency}</div>
                  <div className="mt-1.5 space-y-0.5">
                    {(list.tracks ?? []).slice(0, 3).map((song, index) => (
                      <div key={song.id} className="truncate text-[10px] text-black/45">
                        <span className={index === 0 ? 'text-brand/80' : 'text-black/25'}>{index + 1}</span>
                        {`  ${song.name}`}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
