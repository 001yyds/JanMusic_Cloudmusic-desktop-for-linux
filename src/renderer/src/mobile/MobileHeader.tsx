import { ChevronLeft, Search, UserRound } from 'lucide-react'
import { coverUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { Logo } from '../components/Logo'

export function MobileHeader(): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const back = useUiStore((state) => state.back)
  const canGoBack = useUiStore((state) => state.canGoBack)
  const route = useUiStore((state) => state.route)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const profile = useAuthStore((state) => state.profile)

  const inLibrary = route.page === 'library' || route.page === 'settings'

  return (
    <header className="lg-bar lg-bar-top mobile-header relative z-30 flex shrink-0 items-center gap-2 px-4 pb-2">
      {canGoBack ? (
        <button
          onClick={back}
          className="glass-soft flex h-9 w-9 items-center justify-center rounded-full text-black/55 transition-transform duration-200 active:scale-90"
          aria-label="返回"
        >
          <ChevronLeft size={19} />
        </button>
      ) : (
        <div className="flex items-center gap-2 pl-0.5">
          <Logo size={23} />
          <span className="text-[10px] font-semibold tracking-[0.26em] text-black/60">JANMUSIC</span>
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={() => navigate({ page: 'search' })}
        className={cn(
          'glass-soft flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-90',
          route.page === 'search' ? 'text-brand' : 'text-black/50'
        )}
        aria-label="搜索"
      >
        <Search size={17} />
      </button>

      <button
        onClick={() => {
          if (profile) navigate({ page: 'library' })
          else setLoginOpen(true)
        }}
        className={cn(
          'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-transform duration-200 active:scale-90',
          inLibrary ? 'ring-2 ring-brand/45' : 'ring-1 ring-white/60'
        )}
        aria-label="我的音乐"
      >
        {profile?.avatarUrl ? (
          <img
            src={coverUrl(profile.avatarUrl, 96)}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="glass-soft flex h-full w-full items-center justify-center text-black/45">
            <UserRound size={16} />
          </span>
        )}
      </button>
    </header>
  )
}
