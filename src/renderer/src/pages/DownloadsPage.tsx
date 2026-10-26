import { useEffect, useState } from 'react'
import { FolderOpen, HardDrive, Music4, Trash2 } from 'lucide-react'
import { coverUrl } from '../lib/api'
import { formatBytes } from '../lib/format'
import { isMobile } from '../lib/platform'
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
  const [cache, setCache] = useState({ audio: 0, images: 0 })
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    void refresh()
    void window.ncm.cache.info().then(setCache)
  }, [refresh])

  const downloads = settings?.downloads ?? []
  const totalSize = downloads.reduce((sum, item) => sum + item.size, 0)
  const cacheSize = cache.audio + cache.images

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

      <div className="glass-panel relative mt-5 rounded-[24px] border border-white/40 p-2 sm:mt-7">
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
