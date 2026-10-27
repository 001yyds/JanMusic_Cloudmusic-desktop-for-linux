import { ChevronRight, Download, LibraryBig, Plus, Settings2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

function NavItem({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex h-9 w-full items-center gap-3 rounded-[11px] px-3 text-[13px] transition-all duration-200',
        active
          ? 'glass-pill text-black'
          : 'text-black/50 hover:bg-white/20 hover:text-black/80 active:scale-[0.985]'
      )}
    >
      <Icon
        size={17}
        strokeWidth={1.9}
        className={cn(active ? 'text-brand' : 'text-black/40 transition-colors duration-200 group-hover:text-black/65')}
      />
      <span className="flex-1 text-left">{label}</span>
      {active && <span className="h-1 w-1 rounded-full bg-brand shadow-[0_0_8px_rgba(255,25,73,0.55)]" />}
    </button>
  )
}

export function Sidebar(): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const route = useUiStore((state) => state.route)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)
  const { loggedIn, profile, playlists } = useAuthStore()

  return (
    <aside className="glass-panel relative flex w-[216px] shrink-0 flex-col border-r border-white/25 xl:w-[232px]">
      <nav className="flex flex-col gap-1 px-2.5 pt-1">
        <NavItem icon={Sparkles} label="推荐" active={route.page === 'home'} onClick={() => navigate({ page: 'home' })} />
        <NavItem
          icon={LibraryBig}
          label="我的音乐"
          active={route.page === 'library'}
          onClick={() => navigate({ page: 'library' })}
        />
        <NavItem
          icon={Download}
          label="我的下载"
          active={route.page === 'downloads'}
          onClick={() => navigate({ page: 'downloads' })}
        />
        <NavItem
          icon={Settings2}
          label="设置"
          active={route.page === 'settings'}
          onClick={() => navigate({ page: 'settings' })}
        />
      </nav>

      <div className="mt-6 flex items-center justify-between px-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/35">我的歌单</span>
        <button
          onClick={() => {
            if (!loggedIn) setLoginOpen(true)
            else toast('在网易云客户端创建歌单后会自动同步', 'info')
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-black/30 transition-all duration-200 hover:bg-black/[0.06] hover:text-black active:scale-90"
          aria-label="新建歌单"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {playlists.map((playlist) => {
          const active = route.page === 'playlist' && route.id === playlist.id
          return (
            <button
              key={playlist.id}
              onClick={() => navigate({ page: 'playlist', id: playlist.id, title: playlist.name })}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-all duration-200',
                active ? 'glass-pill' : 'hover:bg-white/20 active:scale-[0.985]'
              )}
            >
              <Cover
                src={coverUrl(playlist.coverImgUrl ?? playlist.picUrl, 64)}
                radius={5}
                className="h-7 w-7 shrink-0"
              />
              <span
                className={cn(
                  'truncate text-[12px] transition-colors duration-200',
                  active ? 'text-black' : 'text-black/55 group-hover:text-black/80'
                )}
              >
                {playlist.name}
              </span>
            </button>
          )
        })}
        {!playlists.length && (
          <p className="px-3 py-4 text-[11px] leading-relaxed text-black/30">登录后，你的歌单会出现在这里</p>
        )}
      </div>

      <button
        onClick={() => (loggedIn ? navigate({ page: 'library' }) : setLoginOpen(true))}
        className="glass-soft no-drag m-2 flex items-center gap-2.5 rounded-[16px] p-2 text-left transition-all duration-200 hover:bg-white/30 active:scale-[0.985]"
      >
        {profile?.avatarUrl ? (
          <img
            src={coverUrl(profile.avatarUrl, 64)}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-1 ring-black/[0.08]"
            draggable={false}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/12 text-[12px] font-semibold text-brand">
            J
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] text-black/80">{profile?.nickname ?? '点击登录'}</div>
          <div className="truncate text-[10px] text-black/35">
            {loggedIn ? '网易云音乐账号' : '扫码登录网易云音乐'}
          </div>
        </div>
        <ChevronRight size={13} className="text-black/25" />
      </button>
    </aside>
  )
}
