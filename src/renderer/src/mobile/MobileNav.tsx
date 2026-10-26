import { Download, LibraryBig, Settings2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import { useUiStore, type Route } from '../store/ui'

const ITEMS: { icon: LucideIcon; label: string; page: Route['page']; route: Route }[] = [
  { icon: Sparkles, label: '推荐', page: 'home', route: { page: 'home' } },
  { icon: LibraryBig, label: '音乐库', page: 'library', route: { page: 'library' } },
  { icon: Download, label: '下载', page: 'downloads', route: { page: 'downloads' } },
  { icon: Settings2, label: '设置', page: 'settings', route: { page: 'settings' } }
]

export function MobileNav(): React.JSX.Element {
  const route = useUiStore((state) => state.route)
  const navigateRoot = useUiStore((state) => state.navigateRoot)

  return (
    <nav className="mobile-bottom px-3">
      <div className="glass-strong flex h-[58px] items-stretch justify-around rounded-[22px] border border-white/55 px-1 shadow-[0_18px_46px_-26px_rgba(24,32,64,0.4)]">
        {ITEMS.map((item) => {
          const active = route.page === item.page
          const Icon = item.icon
          return (
            <button
              key={item.page}
              onClick={() => navigateRoot(item.route)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[16px] transition-all duration-200 active:scale-95',
                active ? 'text-brand' : 'text-black/40'
              )}
            >
              {active && <span className="absolute inset-x-3 inset-y-1.5 -z-10 rounded-[14px] bg-white/35" />}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.9} />
              <span className={cn('text-[9.5px] tracking-wide', active ? 'font-medium' : '')}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
