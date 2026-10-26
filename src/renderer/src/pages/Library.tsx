import { Heart, LogIn, LogOut, Play } from 'lucide-react'
import { coverUrl } from '../lib/api'
import { playPlaylist } from '../lib/actions'
import { clearPlaylistCache } from '../lib/playlistCache'
import { formatCount } from '../lib/format'
import { useAuthStore } from '../store/auth'
import { useLikesStore } from '../store/likes'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { PlaylistCard } from '../components/PlaylistCard'
import { SectionHeader } from '../components/SectionHeader'
import { Logo } from '../components/Logo'

export function Library(): React.JSX.Element {
  const { loggedIn, profile, playlists } = useAuthStore()
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const navigate = useUiStore((state) => state.navigate)
  const toast = useUiStore((state) => state.toast)
  const likedCount = useLikesStore((state) => state.liked.size)

  if (!loggedIn) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-8 pb-16">
        <div className="relative flex flex-col items-center">
          <div className="absolute -top-10 h-40 w-40 rounded-full bg-brand/10 blur-[70px]" />
          <Logo size={56} />
          <h1 className="mt-7 text-[24px] font-semibold tracking-[-0.02em] text-black/90">登录后开启你的音乐库</h1>
          <p className="mt-2 max-w-[360px] text-center text-[12.5px] leading-relaxed text-black/40">
            同步网易云音乐账号的歌单、收藏与每日推荐，所有数据只保存在这台电脑上。
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="mt-6 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[12.5px] font-medium text-white shadow-[0_8px_24px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
          >
            <LogIn size={14} />
            扫码登录
          </button>
        </div>
      </div>
    )
  }

  const likedPlaylist = playlists.find((playlist) => playlist.specialType === 5)
  const others = playlists.filter((playlist) => playlist.specialType !== 5)

  return (
    <div className="relative min-h-full px-8 pb-10 pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(65%_100%_at_30%_0%,rgba(255,25,73,0.08),transparent_70%)]" />

      <header className="relative flex items-center gap-5">
        {profile?.avatarUrl ? (
          <img
            src={coverUrl(profile.avatarUrl, 200)}
            alt=""
            className="h-[76px] w-[76px] rounded-full object-cover ring-2 ring-white/70"
            draggable={false}
          />
        ) : (
          <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-brand/12 text-[24px] font-semibold text-brand">
            {profile?.nickname?.slice(0, 1) ?? 'M'}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.02em] text-black/90">
            {profile?.nickname ?? '我的音乐'}
          </h1>
          <p className="mt-1 truncate text-[12px] text-black/40">
            {profile?.signature || '这个人很懒，什么都没有留下'}
          </p>
          <div className="mt-2.5 flex items-center gap-4 text-[11px] text-black/40">
            <span>
              <span className="font-medium text-black/70">{formatCount(profile?.playlistCount ?? playlists.length)}</span> 歌单
            </span>
            <span>
              <span className="font-medium text-black/70">{formatCount(profile?.follows)}</span> 关注
            </span>
            <span>
              <span className="font-medium text-black/70">{formatCount(profile?.followeds)}</span> 粉丝
            </span>
          </div>
        </div>
        <button
          onClick={async () => {
            await useAuthStore.getState().logout()
            useLikesStore.setState({ liked: new Set(), loaded: false })
            clearPlaylistCache()
            toast('已退出登录', 'success')
            navigate({ page: 'home' })
          }}
          className="glass-soft ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 text-[11px] text-black/50 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-[0.97]"
        >
          <LogOut size={12} />
          退出登录
        </button>
      </header>

      {likedPlaylist && (
        <div className="glass-panel relative mt-7 flex items-center gap-5 overflow-hidden rounded-[24px] border border-white/45 p-5">
          <Cover
            src={coverUrl(likedPlaylist.coverImgUrl, 300)}
            radius={16}
            className="h-[112px] w-[112px] shrink-0 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.4)]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.3em] text-black/40">
              <Heart size={10} className="text-brand" />
              Favorites
            </div>
            <h2 className="mt-1.5 truncate text-[21px] font-semibold tracking-[-0.02em] text-black/90">我喜欢的音乐</h2>
            <p className="mt-1 text-[11.5px] text-black/45">
              {likedPlaylist.trackCount ?? likedCount} 首 · 与网易云同步
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void playPlaylist(likedPlaylist.id)}
                className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-[6px] text-[11.5px] font-medium text-white shadow-[0_6px_18px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                播放
              </button>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-8 -top-12 h-[190px] w-[190px] rounded-full bg-brand/10 blur-[60px]" />
        </div>
      )}

      <section className="relative mt-9">
        <SectionHeader title="我的歌单" subtitle={`共 ${others.length} 个歌单`} />
        {others.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-6 xl:gap-x-5">
            {others.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/50 py-12 text-center text-[12px] text-black/35">
            还没有创建或收藏歌单
          </div>
        )}
      </section>
    </div>
  )
}
