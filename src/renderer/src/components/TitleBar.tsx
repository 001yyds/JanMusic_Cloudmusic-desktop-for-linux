import { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Minus, Search, Square, X } from 'lucide-react'
import { useUiStore } from '../store/ui'
import { Logo } from './Logo'

function WindowButton({
  onClick,
  children,
  danger
}: {
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={
        danger
          ? 'flex h-8 w-10 items-center justify-center rounded-[9px] text-black/45 transition-all duration-200 hover:bg-[#e81123] hover:text-white active:scale-95'
          : 'flex h-8 w-10 items-center justify-center rounded-[9px] text-black/45 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-95'
      }
    >
      {children}
    </button>
  )
}

export function TitleBar(): React.JSX.Element {
  const navigate = useUiStore((state) => state.navigate)
  const back = useUiStore((state) => state.back)
  const canGoBack = useUiStore((state) => state.canGoBack)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void window.ncm.win.isMaximized().then(setMaximized)
    return window.ncm.win.onMaximize(setMaximized)
  }, [])

  return (
    <header className="lg-bar lg-bar-top drag relative z-30 flex h-[52px] shrink-0 items-center gap-2 px-4">
      <div className="no-drag flex items-center gap-2.5 pl-0.5">
        <Logo size={24} />
        <span className="text-[10.5px] font-semibold tracking-[0.28em] text-black/65">JANMUSIC</span>
      </div>

      <div className="no-drag ml-4 flex items-center">
        <button
          onClick={back}
          disabled={!canGoBack}
          className="flex h-8 w-8 items-center justify-center rounded-[9px] text-black/45 transition-all duration-200 enabled:hover:bg-white/30 enabled:hover:text-black enabled:active:scale-95 disabled:opacity-25"
          aria-label="返回"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      <div className="drag flex flex-1 justify-center">
        <button
          onClick={() => navigate({ page: 'search' })}
          className="glass no-drag group flex h-[34px] w-[280px] items-center gap-2.5 rounded-full px-4 text-left transition-all duration-300 hover:bg-white/30 xl:w-[360px]"
        >
          <Search size={14} className="text-black/35 transition-colors duration-200 group-hover:text-black/60" />
          <span className="flex-1 text-[12px] text-black/35">搜索歌曲、歌手、歌单</span>
          <kbd className="rounded-[5px] border border-white/50 bg-white/25 px-1.5 py-0.5 text-[9px] text-black/35">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="no-drag flex items-center gap-0.5">
        <WindowButton onClick={() => window.ncm.win.minimize()}>
          <Minus size={14} />
        </WindowButton>
        <WindowButton onClick={() => void window.ncm.win.toggleMaximize()}>
          {maximized ? <Copy size={12} /> : <Square size={11} />}
        </WindowButton>
        <WindowButton danger onClick={() => window.ncm.win.close()}>
          <X size={14} />
        </WindowButton>
      </div>
    </header>
  )
}
