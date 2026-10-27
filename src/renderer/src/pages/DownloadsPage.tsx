import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FolderOpen, HardDrive, Loader2, Music4, Trash2, X } from 'lucide-react'
import { coverUrl, songArtists } from '../lib/api'
import { cn } from '../lib/cn'
import { formatBytes } from '../lib/format'
import { isMobile } from '../lib/platform'
import { useDownloadsStore } from '../store/downloads'
import { useSettingsStore } from '../store/settings'
import { useUiStore } from '../store/ui'
import { Cover } from '../components/Cover'

const QUALITY_LABEL: Record<string, string> = {
  standard: '标准',
  higher: '较高',
  exhigh: '极高',
  lossless: '无损',
  hires: 'Hi-Res'
}

export function DownloadsPage(): React.JSX.Element {
  const settings = useSettingsStore((state) => state.settings)
  const refresh = useSettingsStore((state) => state.refreshDownloads)
  const toast = useUiStore((state) => state.toast)
  const tasks = useDownloadsStore((state) => state.tasks)
  const clearFinished = useDownloadsStore((state) => state.clearFinished)
  const removeTask = useDownloadsStore((state) => state.removeTask)
  const [cache, setCache] = useState({ audio: 0, images: 0 })
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    void refresh()
    void window.ncm.cache.info().then(setCache)
  }, [refresh])

  const downloads = settings?.downloads ?? []
  const totalSize = downloads.reduce((sum, item) => sum + item.size, 0)
  const cacheSize = cache.audio + cache.images
  const activeCount = tasks.filter((task) => task.status === 'queued' || task.status === 'downloading').length
  const hasFinished = tasks.some((task) => task.status === 'done' || task.status === 'error')

  const clearCache = async (): Promise<void> => {
    setClearing(true)
    try {
      await window.ncm.cache.clear()
      setCache({ audio: 0, images: 0 })
      toast('本地缓存已清理', 'success')
    } catch {
      toast('清理缓存失败', 'error')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="relative min-h-full px-4 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(55%_100%_at_30%_0%,rgba(255,25,73,0.06),transparent_70%)]" />

      <header className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/35 sm:text-[10.5px]">Downloads</p>
          <h1 className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-black/90 sm:mt-2.5 sm:text-[30px]">我的下载</h1>
          <p className="mt-2 text-[11.5px] text-black/40 sm:text-[12px]">
            {downloads.length} 首 · 共 {formatBytes(totalSize)}
          </p>
        </div>
        <button
          onClick={() => {
            void window.ncm.downloads.openFolder().then((path) => {
              if (isMobile()) toast(`已保存到 ${path}`, 'info')
            })
          }}
          className="glass-soft flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11.5px] text-black/55 transition-all duration-200 hover:bg-white/30 hover:text-black active:scale-[0.97]"
        >
          <FolderOpen size={13} />
          {isMobile() ? '下载位置' : '打开下载目录'}
        </button>
      </header>

      <div className="glass-panel relative mt-4 rounded-[24px] border border-white/40 p-2 sm:mt-5">
        <div className="flex items-center gap-2 px-3 pb-1.5 pt-1.5">
          <Download size={14} className="text-brand" />
          <span className="text-[12.5px] font-medium text-black/80">下载列表</span>
          <span className="rounded-full bg-white/35 px-1.5 py-0.5 text-[10px] text-black/45">{tasks.length}</span>
          {activeCount > 0 && (
            <span className="text-[10.5px] text-black/35">正在下载 {activeCount} 首</span>
          )}
          {hasFinished && (
            <button
              onClick={clearFinished}
              className="ml-auto rounded-full px-2 py-1 text-[10px] text-black/35 transition-colors duration-200 hover:bg-white/30 hover:text-black/70"
            >
              清除已完成
            </button>
          )}
        </div>

        {tasks.length ? (
          <div className="flex flex-col">
            {tasks.map((task) => {
              const percent = task.total ? Math.min(100, Math.round((task.received / task.total) * 100)) : 0
              const active = task.status === 'queued' || task.status === 'downloading'
              return (
                <div
                  key={task.key}
                  className="group grid grid-cols-[40px_minmax(0,1fr)_28px] items-center gap-3 rounded-[14px] px-2.5 py-2 transition-colors duration-200 hover:bg-white/25"
                >
                  <Cover src={coverUrl(task.song.al?.picUrl ?? task.song.album?.picUrl, 100)} radius={8} className="h-9 w-9" />
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] text-black/85">{task.song.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px]">
                      <span className="truncate text-black/45">{songArtists(task.song)}</span>
                      <span className="text-black/15">·</span>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1',
                          task.status === 'error'
                            ? 'text-brand'
                            : task.status === 'done'
                              ? 'text-emerald-600/80'
                              : 'text-black/45'
                        )}
                      >
                        {task.status === 'downloading' && <Loader2 size={10} className="animate-spin" />}
                        {task.status === 'done' && <CheckCircle2 size={10} />}
                        {task.status === 'error' && <AlertCircle size={10} />}
                        {task.status === 'queued' && '等待下载'}
                        {task.status === 'downloading' && (task.total ? `${percent}%` : '下载中…')}
                        {task.status === 'done' && `已完成 · ${formatBytes(task.received)}`}
                        {task.status === 'error' && (task.error ?? '下载失败')}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className={cn('h-full rounded-full bg-brand transition-[width] duration-300', !task.total && 'w-1/3 animate-pulse')}
                          style={task.total ? { width: `${percent}%` } : undefined}
                        />
                      </div>
                    )}
                  </div>
                  {!active && (
                    <button
                      onClick={() => removeTask(task.key)}
                      className="flex h-7 w-7 items-center justify-center rounded-[8px] text-black/25 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-90"
                      title="从列表移除"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <Download size={20} strokeWidth={1.3} className="text-black/12" />
            <p className="mt-2 text-[11px] text-black/25">暂无下载任务</p>
          </div>
        )}
      </div>

      <div className="glass-soft relative mt-4 flex flex-wrap items-center gap-2.5 rounded-[18px] border border-white/40 px-4 py-3 sm:mt-5 sm:flex-nowrap sm:gap-3">
        <HardDrive size={15} className="shrink-0 text-black/30" />
        <div className="min-w-0 flex-1 text-[11px] text-black/45 sm:text-[11.5px]">
          {isMobile() ? (
            <>
              下载位置 <span className="font-medium text-black/75">Documents/JanMusic</span>
              <span className="mx-1.5 text-black/15">·</span>
              已下载歌曲可直接离线播放
            </>
          ) : (
            <>
              本地缓存 <span className="font-medium text-black/75">{formatBytes(cacheSize)}</span>
              <span className="mx-2 text-black/15">·</span>
              播放 15 秒后自动补全整首，离线也能听
            </>
          )}
        </div>
        {!isMobile() && (
          <button
            onClick={() => void clearCache()}
            disabled={clearing || cacheSize === 0}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-3 py-1 text-[10.5px] text-black/50 transition-all duration-200 enabled:hover:bg-white/40 enabled:hover:text-black disabled:opacity-25"
          >
            <Trash2 size={11} />
            {clearing ? '清理中…' : '清理缓存'}
          </button>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between px-1 sm:mt-6">
        <h2 className="text-[13px] font-medium text-black/80">已下载</h2>
        <span className="text-[9.5px] uppercase tracking-[0.24em] text-black/35">Library</span>
      </div>

      <div className="glass-panel relative mt-2 rounded-[24px] border border-white/40 p-2">
        {downloads.length ? (
          <div className="flex flex-col">
            {downloads.map((item) => (
              <div
                key={`${item.id}-${item.createdAt}`}
                className="group grid grid-cols-[44px_minmax(0,2.4fr)_70px_86px] items-center gap-3 rounded-[14px] px-2.5 py-2 transition-colors duration-200 hover:bg-white/25 min-[1040px]:grid-cols-[44px_minmax(0,2.4fr)_minmax(0,1.4fr)_70px_86px_90px]"
              >
                <Cover src={coverUrl(item.cover, 100)} radius={8} className="h-10 w-10" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-black/85">{item.name}</div>
                  <div className="truncate text-[11px] text-black/45">{item.artist}</div>
                </div>
                <div className="hidden truncate text-[11.5px] text-black/45 min-[1040px]:block">{item.album || '—'}</div>
                <div className="text-[10.5px] text-brand/80">{QUALITY_LABEL[item.level] ?? item.level}</div>
                <div className="tabular text-right text-[10.5px] text-black/35">{formatBytes(item.size)}</div>
                <div className="tabular hidden text-right text-[10px] text-black/25 min-[1040px]:block">
                  {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Music4 size={38} strokeWidth={1.2} className="text-black/12" />
            <p className="mt-4 text-[12.5px] text-black/30">还没有下载的歌曲</p>
            <p className="mt-1 text-[11px] text-black/20">在歌曲右侧点击下载图标即可离线收听</p>
          </div>
        )}
      </div>
    </div>
  )
}
