import { useEffect } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { songCover } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useContentStore } from '../store/content'
import { usePlayerStore } from '../store/player'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'
import { TrackList } from '../components/TrackList'

export function DailyPage(): React.JSX.Element {
  const daily = useContentStore((state) => state.daily)
  const load = useContentStore((state) => state.load)
  const loading = useContentStore((state) => state.loading)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const playQueue = usePlayerStore((state) => state.playQueue)

  useEffect(() => {
    void load()
  }, [load])

  const date = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="relative min-h-full px-8 pb-10 pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(60%_100%_at_35%_0%,rgba(255,25,73,0.08),transparent_72%)]" />

      <header className="relative flex items-end gap-6">
        <div className="glass-tile shrink-0 rounded-[24px] border border-white/40 p-1.5">
          <div className="grid h-[172px] w-[172px] grid-cols-2 gap-[2px] overflow-hidden rounded-[18px] shadow-[0_18px_44px_-22px_rgba(0,0,0,0.4)]">
            {(daily.length ? daily.slice(0, 4) : [null, null, null, null]).map((song, index) =>
              song ? (
                <Cover key={song.id} src={songCover(song, 240)} radius={0} className="h-full w-full" />
              ) : (
                <div key={index} className="skeleton h-full w-full" />
              )
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.32em] text-black/40">
            <Sparkles size={10} className="text-brand" />
            Daily Mix
          </div>
          <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-black/90">每日推荐</h1>
          <p className="mt-2 text-[11.5px] text-black/40">
            {date} · {daily.length} 首 · 每天 6:00 更新
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            {loggedIn ? (
              <button
                onClick={() => daily.length && playQueue(daily, 0)}
                disabled={!daily.length}
                className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-[12px] font-medium text-white shadow-[0_8px_22px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              >
                <Play size={13} fill="currentColor" />
                播放全部
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="rounded-full bg-brand px-5 py-2 text-[12px] font-medium text-white shadow-[0_8px_22px_rgba(255,25,73,0.28)] transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                登录后查看每日推荐
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="glass-panel relative mt-8 rounded-[24px] border border-white/40 p-2">
        {loading && !daily.length ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton h-12 rounded-[10px]" />
            ))}
          </div>
        ) : daily.length ? (
          <TrackList songs={daily} />
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/50 py-14 text-center text-[12px] text-black/35">
            登录后即可获得每日推荐
          </div>
        )}
      </div>
    </div>
  )
}
